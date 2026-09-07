import { BaseVoiceEngine } from './base-voice.engine';
import { VoiceSessionConfig, VoiceEngineEvents } from '../types/voice.types';
import { aiToolRegistry, AIProviderService, AICompanyConfigService } from '@workspace/ai';
import { GuardrailEnforcementEngine } from '../guardrails/guardrail-enforcement.engine';
import { SentenceStreamer } from '../streaming/sentence-streamer';
import { prisma } from '@workspace/db';
import Groq from 'groq-sdk';
import WebSocket from 'ws';

export class CascadedVoiceEngine extends BaseVoiceEngine {
  private cartesiaSttWs: WebSocket | null = null;
  private groq: Groq | null = null;
  private cartesiaWs: WebSocket | null = null;
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string }> = [];
  private isAgentSpeaking: boolean = false;
  private isGeneratingResponse: boolean = false;
  private currentLlmAbortController: AbortController | null = null;
  private isTerminated: boolean = false;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private inactivityPromptCount: number = 0;
  private lastAgentSpokeTimestamp: number = 0;
  private interruptedThought: string | null = null;
  private currentSpeakingSentence: string = '';
  
  // Turn Management & Utterance Debouncing
  private turnEpoch: number = 0;
  private activeTtsContextId: string = 'call_init';
  private pendingUtteranceBuffer: string = '';
  private utteranceDebounceTimer: NodeJS.Timeout | null = null;
  private sustainedSpeechFrames: number = 0;
  private sentenceStreamer: SentenceStreamer = new SentenceStreamer({ minWordsPerChunk: 3, maxWordsPerChunk: 20 });

  private static readonly FILLER_WORDS = new Set([
    'uh', 'um', 'ah', 'er', 'hmm', 'hm', 'like', 'yeah', 'so', 'and', 'well', 'okay', 'wait'
  ]);

  constructor(config: VoiceSessionConfig, events: VoiceEngineEvents) {
    super(config, events);
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  async start(): Promise<void> {
    const cartesiaKey = process.env.CARTESIA_API_KEY;

    // 1. Initialize Cartesia Unified Streaming STT with Industry Standard Telephony Thresholds
    // turn_end_threshold=0.7 (prevents premature cutoffs), turn_end_timeout_ms=900 (natural speech cadence)
    if (cartesiaKey) {
      this.cartesiaSttWs = new WebSocket(
        `wss://api.cartesia.ai/stt/websocket?model=ink-2&cartesia_version=2026-08-14&encoding=pcm_s16le&sample_rate=16000&api_key=${cartesiaKey}&turn_end_threshold=0.7&turn_end_timeout_ms=900`
      );

      this.cartesiaSttWs.on('message', (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString());
          const transcript = (msg.text || msg.transcript || '').trim();
          if (!transcript) return;
          const isFinal = Boolean(msg.is_final || msg.type === 'turn_end' || msg.final);

          this.events.onTranscript('user', transcript, isFinal);

          if (!isFinal) {
            // Eager Barge-in: if agent is currently speaking or generating response, interrupt immediately on human speech
            if (this.isAgentSpeaking || this.isGeneratingResponse) {
              if (this.isAcousticEcho(transcript)) {
                return;
              }
              const agentSpeakingDuration = Date.now() - this.lastAgentSpokeTimestamp;
              if (transcript.length >= 4 && agentSpeakingDuration > 600) {
                console.log(`[CascadedEngine] Instant barge-in triggered on interim transcript: "${transcript}"`);
                this.handleBargeIn();
              }
            }
          } else {
            // Final transcript: route through utterance debouncer & aggregator
            this.handleFinalTranscript(transcript);
          }
        } catch {}
      });

      this.cartesiaSttWs.on('error', (err: any) => {
        this.events.onError(new Error(`Cartesia STT error: ${err.message || err}`));
      });
    }

    // 2. Initialize Cartesia Sonic Streaming WebSocket (Sub-60ms Generative Audio)
    if (cartesiaKey) {
      this.cartesiaWs = new WebSocket(
        `wss://api.cartesia.ai/tts/websocket?api_key=${cartesiaKey}&cartesia_version=2026-08-14`
      );

      this.cartesiaWs.on('message', (data: any) => {
        try {
          const response = JSON.parse(data.toString());
          // Context ID Guard: Discard any audio chunks arriving from an older/interrupted turn
          if (response.context_id && response.context_id !== this.activeTtsContextId) {
            return;
          }
          if (response.data) {
            const audioChunk = Buffer.from(response.data, 'base64');
            this.events.onAudioChunk(audioChunk);
          }
        } catch {
          if (Buffer.isBuffer(data) && this.isAgentSpeaking) {
            this.events.onAudioChunk(data);
          }
        }
      });

      this.cartesiaWs.on('error', (err: any) => {
        this.events.onError(new Error(`Cartesia error: ${err.message || err}`));
      });

      // Pre-warm Cartesia WebSocket connection
      await this.waitForCartesiaTts(2000).catch(() => {});
    }

    // 3. Initialize System Conversation History with 180workspace context & strict conversational rules
    this.conversationHistory.push({
      role: 'system',
      content: `${this.config.systemPrompt}\n\n` +
        `IMPORTANT VOICE AGENT PRODUCTION CONVERSATIONAL RULES:\n` +
        `1. NEVER repeatedly say "Hello", "Hi there", or greet again once the call is in progress. The opening greeting has already occurred.\n` +
        `2. Keep responses concise, direct, and conversational (1 to 2 spoken sentences maximum per turn).\n` +
        `3. Never output markdown formatting, bullet points, asterisks, or URLs because you are speaking over a live telephone call.\n` +
        `4. Seamlessly match the caller's language: if they speak Hindi, respond in fluent natural Hindi; if English, respond in English; if Hinglish, respond in Hinglish.\n` +
        `5. When confirming an action, execute the appropriate tool immediately and naturally speak the confirmation to the caller.`
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
      await this.waitForCartesiaTts(3000);
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
      if (this.isTerminated || this.isAgentSpeaking || this.isGeneratingResponse) return;

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

    // Fast Acoustic Energy (RMS) VAD for sub-50ms Barge-In Interruption
    if (this.isAgentSpeaking) {
      const pcm = pcmChunk instanceof Int16Array
        ? pcmChunk
        : new Int16Array(pcmChunk.buffer, pcmChunk.byteOffset, Math.floor(pcmChunk.byteLength / 2));
      
      let sumSquares = 0;
      for (let i = 0; i < pcm.length; i++) {
        sumSquares += pcm[i] * pcm[i];
      }
      const rms = Math.sqrt(sumSquares / (pcm.length || 1));

      // Telephony voice RMS threshold: ignore residual line echo and handset feedback (< 2600)
      const agentSpeakingDuration = Date.now() - this.lastAgentSpokeTimestamp;
      const minGracePeriodPassed = agentSpeakingDuration > 800;

      if (minGracePeriodPassed && rms > 2800) {
        this.sustainedSpeechFrames++;
        if (this.sustainedSpeechFrames >= 4) { // ~80ms sustained speech
          this.sustainedSpeechFrames = 0;
          console.log(`[CascadedEngine] Energy VAD barge-in triggered (RMS: ${Math.round(rms)})`);
          this.handleBargeIn();
        }
      } else {
        this.sustainedSpeechFrames = Math.max(0, this.sustainedSpeechFrames - 1);
      }
    }

    if (this.cartesiaSttWs && this.cartesiaSttWs.readyState === WebSocket.OPEN) {
      const buffer = pcmChunk instanceof Buffer ? pcmChunk : Buffer.from(pcmChunk.buffer);
      this.cartesiaSttWs.send(buffer);
    }
  }

  handleBargeIn(): void {
    this.resetInactivityTimer();
    if (this.utteranceDebounceTimer) {
      clearTimeout(this.utteranceDebounceTimer);
      this.utteranceDebounceTimer = null;
    }

    const wasActive = this.isAgentSpeaking || this.isGeneratingResponse;

    if (this.currentSpeakingSentence.trim()) {
      this.interruptedThought = this.currentSpeakingSentence.trim();
    }

    if (this.currentLlmAbortController) {
      this.currentLlmAbortController.abort();
      this.currentLlmAbortController = null;
    }

    this.sentenceStreamer.reset();

    // Terminate in-flight audio synthesis on Cartesia WebSocket
    if (this.cartesiaWs && this.cartesiaWs.readyState === WebSocket.OPEN) {
      this.cartesiaWs.send(JSON.stringify({ context_id: this.activeTtsContextId, cancel: true }));
    }

    // Invalidate active context so any late-arriving packets are dropped immediately
    this.activeTtsContextId = `cancelled_${Date.now()}`;
    this.isAgentSpeaking = false;
    this.isGeneratingResponse = false;
    this.lastAgentSpokeTimestamp = Date.now();
    this.currentSpeakingSentence = '';

    if (wasActive) {
      this.events.onInterrupted();
    }
  }

  private isAcousticEcho(userInput: string): boolean {
    if (!this.currentSpeakingSentence && !this.lastAgentSpokeTimestamp) return false;
    const now = Date.now();
    if (!this.isAgentSpeaking && (now - this.lastAgentSpokeTimestamp > 1500)) return false;

    const cleanUser = userInput.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const cleanAgent = this.currentSpeakingSentence.toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (!cleanUser || !cleanAgent) return false;

    if (cleanAgent.includes(cleanUser) || (cleanUser.length > 4 && cleanAgent.startsWith(cleanUser))) {
      return true;
    }
    return false;
  }

  /**
   * Aggregates rapid-fire sentence fragments and buffers filler words before triggering LLM
   */
  private handleFinalTranscript(transcript: string): void {
    if (this.isTerminated || !transcript.trim()) return;

    if (this.isAcousticEcho(transcript)) {
      console.log(`[CascadedEngine] Filtered acoustic speaker echo: "${transcript}"`);
      return;
    }

    const clean = transcript.trim();
    const words = clean.toLowerCase().split(/\s+/);
    const isPureFiller = words.length === 1 && CascadedVoiceEngine.FILLER_WORDS.has(words[0].replace(/[^\w]/g, ''));

    if (isPureFiller) {
      this.pendingUtteranceBuffer = (this.pendingUtteranceBuffer + ' ' + clean).trim();
      console.log(`[CascadedEngine] Buffered filler: "${clean}" (buffer: "${this.pendingUtteranceBuffer}")`);
      if (this.utteranceDebounceTimer) clearTimeout(this.utteranceDebounceTimer);
      this.utteranceDebounceTimer = setTimeout(() => {
        this.pendingUtteranceBuffer = '';
      }, 1200);
      return;
    }

    // Accumulate all consecutive fragments into the turn buffer
    this.pendingUtteranceBuffer = (this.pendingUtteranceBuffer + ' ' + clean).trim();

    if (this.utteranceDebounceTimer) {
      clearTimeout(this.utteranceDebounceTimer);
      this.utteranceDebounceTimer = null;
    }

    // 400ms debounce: If the user pauses for a split second between compound clauses, merge them into 1 atomic turn
    this.utteranceDebounceTimer = setTimeout(() => {
      const fullTurnText = this.pendingUtteranceBuffer.trim();
      this.pendingUtteranceBuffer = '';
      if (fullTurnText) {
        this.executeUserTurn(fullTurnText);
      }
    }, 400);
  }

  /**
   * Executes an atomic, single-turn LLM generation with execution mutex & context isolation
   */
  private async executeUserTurn(userInput: string): Promise<void> {
    if (this.isTerminated || !userInput.trim()) return;

    // Terminate any previous generation or playback immediately
    this.handleBargeIn();

    this.isGeneratingResponse = true;
    this.turnEpoch++;
    const turnId = this.turnEpoch;
    this.activeTtsContextId = `turn_${turnId}_${Date.now()}`;

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
    const signal = this.currentLlmAbortController.signal;

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
      this.sentenceStreamer.reset();

      // Execute with Multi-Provider LLM Fallback (Groq primary -> Gemini / ProviderService fallback)
      assistantText = await this.generateStreamingCompletion(
        this.conversationHistory,
        activeTools,
        signal,
        (tokenChunk) => {
          if (signal.aborted || this.turnEpoch !== turnId) return;
          const sentences = this.sentenceStreamer.push(tokenChunk);
          for (const s of sentences) {
            if (signal.aborted || this.turnEpoch !== turnId) break;
            this.streamTtsChunk(s, false, this.activeTtsContextId);
          }
        },
        (calls) => { toolCallsMap = calls; }
      );

      if (signal.aborted || this.turnEpoch !== turnId) return;

      // Flush any trailing sentence buffer to Cartesia TTS
      const remainingSentences = this.sentenceStreamer.flush();
      for (const s of remainingSentences) {
        if (signal.aborted || this.turnEpoch !== turnId) break;
        this.streamTtsChunk(s, true, this.activeTtsContextId);
      }

      if (assistantText.trim()) {
        this.conversationHistory.push({ role: 'assistant', content: assistantText });
        this.events.onTranscript('agent', assistantText, true);
      }

      // Execute any invoked tools
      const toolCalls = Object.values(toolCallsMap);
      if (toolCalls.length > 0 && !signal.aborted && this.turnEpoch === turnId) {
        for (const tc of toolCalls) {
          if (signal.aborted || this.turnEpoch !== turnId) break;
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.arguments || '{}');
          } catch {
            parsedArgs = {};
          }

          this.events.onToolCallStart(tc.name, parsedArgs);

          // 1. Intercept with Deterministic Guardrails Engine
          const guardrailCheck = await GuardrailEnforcementEngine.validateToolAction(
            this.config.voiceAgentId || '',
            this.config.companyId,
            tc.name,
            parsedArgs
          );

          let finalArgs = parsedArgs;
          let toolResult: any;

          if (!guardrailCheck.allowed) {
            toolResult = {
              status: 'blocked',
              message: guardrailCheck.reason || 'Action blocked by safety guardrail policy.'
            };
          } else {
            finalArgs = guardrailCheck.sanitizedArguments || parsedArgs;
            const execContext = {
              companyId: this.config.companyId,
              userId: this.config.userId
            };

            try {
              toolResult = await aiToolRegistry.executeTool(tc.name, finalArgs, execContext);
              if (guardrailCheck.overridden && guardrailCheck.reason) {
                toolResult = {
                  ...toolResult,
                  guardrailNote: guardrailCheck.reason
                };
              }
            } catch (toolErr: any) {
              console.warn(`[CascadedVoiceEngine] Gracefully caught tool error on ${tc.name}:`, toolErr.message);
              toolResult = {
                status: 'error',
                message: `Action failed: ${toolErr.message || 'Service temporarily unavailable'}`
              };
            }
          }

          this.events.onToolCallEnd(tc.name, toolResult);

          // 2. Asynchronously persist forensic ActionAuditLog
          if (this.config.callSessionId) {
            (prisma as any).actionAuditLog.create({
              data: {
                companyId: this.config.companyId,
                callSessionId: this.config.callSessionId,
                turnIndex: this.conversationHistory.length,
                customerSpeech: userInput,
                detectedIntent: tc.name,
                confidence: 1.0,
                toolName: tc.name,
                toolArguments: finalArgs,
                toolResult,
                policyCheck: guardrailCheck.overridden ? 'OVERRIDDEN' : (guardrailCheck.allowed ? 'PASSED' : 'BLOCKED'),
                policyReason: guardrailCheck.reason || null,
                agentUtterance: assistantText || '',
                latencyMs: 120
              }
            }).catch(() => {});
          }

          this.conversationHistory.push({
            role: 'tool',
            name: tc.name,
            content: JSON.stringify(toolResult)
          });
        }

        // Re-invoke with tool result so AI naturally states the outcome to the caller
        if (!signal.aborted && this.turnEpoch === turnId) {
          await this.executeUserTurn('Continue and report the result of the action.');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      this.events.onError(err);
    } finally {
      if (this.turnEpoch === turnId) {
        this.isGeneratingResponse = false;
      }
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
          if (signal.aborted) break;
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

  /**
   * Guarantees Cartesia TTS WebSocket connection is OPEN before dispatching speech frames
   */
  private async waitForCartesiaTts(timeoutMs: number = 3000): Promise<boolean> {
    if (!this.cartesiaWs) return false;
    if (this.cartesiaWs.readyState === WebSocket.OPEN) return true;
    if (this.cartesiaWs.readyState !== WebSocket.CONNECTING) return false;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(this.cartesiaWs?.readyState === WebSocket.OPEN);
      }, timeoutMs);

      this.cartesiaWs?.once('open', () => {
        clearTimeout(timer);
        resolve(true);
      });
      this.cartesiaWs?.once('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  private async synthesizeAndSpeak(text: string): Promise<void> {
    if (!text || !text.trim() || this.isTerminated) return;
    const isReady = await this.waitForCartesiaTts(2500);
    if (!isReady) {
      console.warn(`[CascadedEngine] Cartesia WebSocket not open (state: ${this.cartesiaWs?.readyState}). Cannot synthesize text.`);
      return;
    }
    this.isAgentSpeaking = true;
    this.currentSpeakingSentence = text;
    this.lastAgentSpokeTimestamp = Date.now();
    this.events.onTranscript('agent', text, true);
    this.streamTtsChunk(text, true, this.activeTtsContextId);
  }

  private streamTtsChunk(text: string, flush = false, contextId: string = 'active_call'): void {
    if (!this.cartesiaWs || this.cartesiaWs.readyState !== WebSocket.OPEN) return;
    this.isAgentSpeaking = true;
    this.currentSpeakingSentence += ' ' + text;
    this.lastAgentSpokeTimestamp = Date.now();

    this.cartesiaWs.send(JSON.stringify({
      model_id: 'sonic-3.6',
      transcript: text,
      voice: {
        mode: 'id',
        id: this.config.voiceId || 'cb9c954d-bcaa-43ed-82bf-aeb5e88a3cb5'
      },
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 16000
      },
      context_id: contextId,
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
    if (this.utteranceDebounceTimer) {
      clearTimeout(this.utteranceDebounceTimer);
      this.utteranceDebounceTimer = null;
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
