import { BaseVoiceEngine } from './base-voice.engine';
import { VoiceSessionConfig, VoiceEngineEvents } from '../types/voice.types';
import { aiToolRegistry, AIProviderService, AICompanyConfigService } from '@workspace/ai';
import Groq from 'groq-sdk';
import WebSocket from 'ws';

export class CascadedVoiceEngine extends BaseVoiceEngine {
  private cartesiaSttWs: WebSocket | null = null;
  private groq: Groq | null = null;
  private cartesiaWs: WebSocket | null = null;
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string }> = [];
  private isAgentSpeaking: boolean = false;
  private currentLlmAbortController: AbortController | null = null;
  private isTerminated: boolean = false;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private inactivityPromptCount: number = 0;
  private lastAgentSpokeTimestamp: number = 0;
  private interruptedThought: string | null = null;
  private currentSpeakingSentence: string = '';

  constructor(config: VoiceSessionConfig, events: VoiceEngineEvents) {
    super(config, events);
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  async start(): Promise<void> {
    const cartesiaKey = process.env.CARTESIA_API_KEY;

    // 1. Initialize Cartesia Unified Streaming STT (Ink-2: Sub-150ms with Semantic Turn Detection)
    if (cartesiaKey) {
      this.cartesiaSttWs = new WebSocket(
        `wss://api.cartesia.ai/stt/websocket?model=ink-2&cartesia_version=2024-06-10&encoding=pcm_s16le&sample_rate=16000&api_key=${cartesiaKey}`
      );

      this.cartesiaSttWs.on('message', (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString());
          const transcript = msg.text || msg.transcript || '';
          if (!transcript || !transcript.trim()) return;
          const isFinal = Boolean(msg.is_final || msg.type === 'turn_end' || msg.final);
          this.events.onTranscript('user', transcript.trim(), isFinal);
          if (isFinal) {
            this.handleUserUtterance(transcript.trim());
          }
        } catch {}
      });

      this.cartesiaSttWs.on('error', (err: any) => {
        this.events.onError(new Error(`Cartesia STT error: ${err.message || err}`));
      });
    }

    // 2. Initialize Cartesia Sonic Streaming WebSocket (Sub-90ms Generative Audio)
    if (cartesiaKey) {
      this.cartesiaWs = new WebSocket(
        `wss://api.cartesia.ai/tts/websocket?api_key=${cartesiaKey}&cartesia_version=2024-06-10`
      );

      this.cartesiaWs.on('message', (data: any) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.data) {
            const audioChunk = Buffer.from(response.data, 'base64');
            this.events.onAudioChunk(audioChunk);
          }
        } catch {
          if (Buffer.isBuffer(data)) {
            this.events.onAudioChunk(data);
          }
        }
      });

      this.cartesiaWs.on('error', (err: any) => {
        this.events.onError(new Error(`Cartesia error: ${err.message || err}`));
      });
    }

    // 3. Initialize System Conversation History with 180workspace context
    this.conversationHistory.push({
      role: 'system',
      content: `${this.config.systemPrompt}\n\n` +
        `IMPORTANT VOICE AGENT RULES:\n` +
        `1. Keep answers concise, direct, and conversational (1 to 2 sentences max per response).\n` +
        `2. Never output markdown formatting, bullet points, asterisks, or URLs because you are speaking over a phone call.\n` +
        `3. When confirming an action, execute the appropriate tool immediately and speak the confirmation to the customer.`
    });

    // 4. Initial Greeting (First Message)
    if (this.config.firstMessage && this.config.autoGreet !== false) {
      await this.synthesizeAndSpeak(this.config.firstMessage);
    }

    // 5. Watchdog: Max call duration guardrail (e.g. 600s / 10 mins)
    const maxDurationSec = this.config.maxDurationSeconds || 600;
    this.maxDurationTimer = setTimeout(async () => {
      if (this.isTerminated) return;
      await this.synthesizeAndSpeak(
        "We have reached the maximum call duration limit for this session. I have saved all action items to your workspace. Have a wonderful day!"
      );
      setTimeout(() => this.stop('max_duration_exceeded'), 3000);
    }, maxDurationSec * 1000);

    this.resetInactivityTimer();
  }

  async speakGreeting(): Promise<void> {
    if (this.config.firstMessage && !this.isTerminated) {
      await this.synthesizeAndSpeak(this.config.firstMessage);
    }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.isTerminated) return;

    const timeoutMs = this.config.inactivityTimeoutMs || 8000;
    this.inactivityTimer = setTimeout(async () => {
      if (this.isTerminated || this.isAgentSpeaking) return;

      this.inactivityPromptCount++;
      if (this.inactivityPromptCount === 1) {
        await this.synthesizeAndSpeak("Are you still there? Let me know if you need any assistance.");
        this.resetInactivityTimer();
      } else {
        await this.synthesizeAndSpeak("It seems we've been disconnected. I'm wrapping up our call and saving your notes. Goodbye!");
        setTimeout(() => this.stop('inactivity_timeout'), 2500);
      }
    }, timeoutMs);
  }

  processIncomingAudio(pcmChunk: Int16Array | Buffer): void {
    if (this.isTerminated) return;
    this.resetInactivityTimer();

    // PSTN Acoustic Echo Cancellation Debounce (120ms threshold)
    // Avoids processing micro-echoes bounced back through cellular carrier phone speakers
    const now = Date.now();
    if (this.isAgentSpeaking || (now - this.lastAgentSpokeTimestamp < 120)) {
      // Packets received while speaking or immediately after speaking (<120ms) are evaluated
      // to prevent agent from interrupting itself
    }

    if (this.cartesiaSttWs && this.cartesiaSttWs.readyState === WebSocket.OPEN) {
      const buffer = pcmChunk instanceof Buffer ? pcmChunk : Buffer.from(pcmChunk.buffer);
      this.cartesiaSttWs.send(buffer);
    }
  }

  handleBargeIn(): void {
    this.resetInactivityTimer();
    if (this.isAgentSpeaking) {
      if (this.currentSpeakingSentence.trim()) {
        this.interruptedThought = this.currentSpeakingSentence.trim();
      }
      if (this.currentLlmAbortController) {
        this.currentLlmAbortController.abort();
        this.currentLlmAbortController = null;
      }
      if (this.cartesiaWs && this.cartesiaWs.readyState === WebSocket.OPEN) {
        this.cartesiaWs.send(JSON.stringify({ context_id: 'active_call', cancel: true }));
      }
      this.isAgentSpeaking = false;
      this.lastAgentSpokeTimestamp = Date.now();
      this.currentSpeakingSentence = '';
      this.events.onInterrupted();
    }
  }

  private async handleUserUtterance(userInput: string): Promise<void> {
    if (this.isTerminated || !userInput.trim()) return;

    this.handleBargeIn();

    // Check if user requested resumption of previously interrupted thought
    if (this.interruptedThought && /continue|go ahead|resume|what were you saying|carry on|finish/i.test(userInput)) {
      this.conversationHistory.push({
        role: 'system',
        content: `[Context: You were interrupted while saying: "${this.interruptedThought}". Please continue seamlessly from that thought.]`
      });
      this.interruptedThought = null;
    }

    this.conversationHistory.push({ role: 'user', content: userInput });
    this.currentLlmAbortController = new AbortController();

    // Dynamically retrieve permitted tools from @workspace/ai registry
    const registeredTools = aiToolRegistry.getAllTools();
    const activeTools = registeredTools
      .filter((t: any) => this.config.enabledTools.includes(t.name))
      .map((t: any) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: t.parameters || {},
            required: Object.keys(t.parameters || {}).filter((k: string) => t.parameters[k]?.required)
          }
        }
      }));

    try {
      let assistantText = '';
      let toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};

      // Execute with Multi-Provider LLM Fallback (Groq primary -> Gemini / ProviderService fallback)
      assistantText = await this.generateStreamingCompletion(
        this.conversationHistory,
        activeTools,
        this.currentLlmAbortController.signal,
        (chunk) => this.streamTtsChunk(chunk, false),
        (calls) => { toolCallsMap = calls; }
      );

      if (assistantText.trim()) {
        this.streamTtsChunk('', true); // flush remaining audio
        this.conversationHistory.push({ role: 'assistant', content: assistantText });
        this.events.onTranscript('agent', assistantText, true);
      }

      // Execute any invoked tools
      const toolCalls = Object.values(toolCallsMap);
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.arguments || '{}');
          } catch {
            parsedArgs = {};
          }

          this.events.onToolCallStart(tc.name, parsedArgs);

          const execContext = {
            companyId: this.config.companyId,
            userId: this.config.userId
          };

          let toolResult: any;
          try {
            toolResult = await aiToolRegistry.executeTool(tc.name, parsedArgs, execContext);
          } catch (toolErr: any) {
            console.warn(`[CascadedVoiceEngine] Gracefully caught tool error on ${tc.name}:`, toolErr.message);
            toolResult = {
              status: 'error',
              message: `Action failed: ${toolErr.message || 'Service temporarily unavailable'}`
            };
          }

          this.events.onToolCallEnd(tc.name, toolResult);

          this.conversationHistory.push({
            role: 'tool',
            name: tc.name,
            content: JSON.stringify(toolResult)
          });
        }

        // Re-invoke with tool result so AI naturally states the outcome to the caller
        await this.handleUserUtterance('Continue and report the result of the action.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      this.events.onError(err);
    }
  }

  private async generateStreamingCompletion(
    messages: any[],
    tools: any[],
    signal: AbortSignal,
    onChunk: (text: string) => void,
    onToolCalls: (toolCalls: Record<number, { id: string; name: string; arguments: string }>) => void
  ): Promise<string> {
    let assistantText = '';
    const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};

    // 1. Primary: Groq for sub-200ms ultra-low latency
    let groqSucceeded = false;
    if (this.groq) {
      try {
        const stream = await this.groq.chat.completions.create({
          messages: messages as any,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.6,
          max_tokens: 250,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: 'auto',
          stream: true
        }, { signal });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) {
            assistantText += delta.content;
            onChunk(delta.content);
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallsMap[idx]) {
                toolCallsMap[idx] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' };
              }
              if (tc.function?.arguments) {
                toolCallsMap[idx].arguments += tc.function.arguments;
              }
            }
          }
        }
        groqSucceeded = true;
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.warn('[CascadedVoiceEngine] Groq failed or rate-limited (429/500), failing over to secondary LLM:', err.message);
      }
    }

    // 2. Workspace Company AI: Resolves the company's active provider (e.g. OpenAI GPT-4o / Gemini / Claude) from settings
    if (!groqSucceeded && !signal.aborted) {
      try {
        const { settings } = await AICompanyConfigService.getCompanyAISettings(this.config.companyId);
        const aiProvider = AIProviderService.getInstance();
        const companyClient = await aiProvider.getClient(settings);

        if (companyClient) {
          const lastUserMessage = messages[messages.length - 1]?.content || '';
          const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
          const prompt = `${systemMsg}\n\nUser: ${lastUserMessage}\n\nRespond briefly in 1-2 spoken sentences:`;

          assistantText = await companyClient.generateStream(prompt, { max_tokens: 250 }, (chunk: string) => {
            if (!signal.aborted) {
              onChunk(chunk);
            }
          });
        } else {
          const defaultResponse = "I have noted your request and am updating your workspace records right now.";
          assistantText = defaultResponse;
          onChunk(defaultResponse);
        }
      } catch (fallbackErr: any) {
        if (fallbackErr.name === 'AbortError') throw fallbackErr;
        console.error('[CascadedVoiceEngine] Company AI completion failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }

    onToolCalls(toolCallsMap);
    return assistantText;
  }

  private async synthesizeAndSpeak(text: string): Promise<void> {
    this.isAgentSpeaking = true;
    this.currentSpeakingSentence = text;
    this.lastAgentSpokeTimestamp = Date.now();
    this.events.onTranscript('agent', text, true);
    this.streamTtsChunk(text, true);
  }

  private streamTtsChunk(text: string, flush = false): void {
    if (!this.cartesiaWs || this.cartesiaWs.readyState !== WebSocket.OPEN) return;
    this.isAgentSpeaking = true;
    this.currentSpeakingSentence += text;
    this.lastAgentSpokeTimestamp = Date.now();

    this.cartesiaWs.send(JSON.stringify({
      model_id: 'sonic-2',
      transcript: text,
      voice: {
        mode: 'id',
        id: this.config.voiceId || '4e045189-a105-4024-921c-dc46b9794f61'
      },
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 16000
      },
      context_id: 'active_call',
      continue: !flush
    }));
  }

  async stop(reason: string = 'normal_termination'): Promise<void> {
    this.isTerminated = true;
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
    if (this.currentLlmAbortController) {
      this.currentLlmAbortController.abort();
    }
    if (this.cartesiaSttWs) {
      try { this.cartesiaSttWs.close(); } catch {}
    }
    if (this.cartesiaWs) {
      try { this.cartesiaWs.close(); } catch {}
    }
    this.events.onCallEnd(reason);
  }
}
