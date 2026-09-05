import Groq from 'groq-sdk';
import { PostCallSummaryResult } from '../types/voice.types';

export class VoiceforcePromptService {
  private groq: Groq | null = null;

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (key) {
      this.groq = new Groq({ apiKey: key });
    }
  }

  /**
   * Formats transcript segments into a clean readable string
   */
  formatTranscript(transcript: Array<{ speaker: string; text: string }>): string {
    return transcript
      .map(t => `${t.speaker.toUpperCase()}: ${t.text}`)
      .join('\n');
  }

  /**
   * Analyzes the conversation transcript and extracts structured call outcomes
   */
  async analyzeTranscript(
    transcript: Array<{ speaker: string; text: string }>
  ): Promise<PostCallSummaryResult> {
    if (!this.groq || transcript.length === 0) {
      return {
        summary: 'Call completed without transcript processing.',
        sentiment: 'neutral',
        callOutcome: 'completed',
        actionItems: [],
        followUpRequired: false
      };
    }

    const conversationText = this.formatTranscript(transcript);

    const prompt = `
You are an expert post-call data analyst for an enterprise AI calling platform.
Analyze this call transcript between an AI employee and a customer:

"""
${conversationText}
"""

Return a valid JSON object matching this schema:
{
  "summary": "Concise 2-sentence summary of call conversation and result",
  "sentiment": "positive" | "neutral" | "negative",
  "callOutcome": "order_confirmed" | "appointment_booked" | "callback_requested" | "not_interested" | "information_provided" | "transferred" | "inquiry_resolved",
  "actionItems": ["Action item 1", "Action item 2"],
  "followUpRequired": true | false
}
`;

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        summary: parsed.summary || 'Call finished.',
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
        callOutcome: parsed.callOutcome || 'completed',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        followUpRequired: Boolean(parsed.followUpRequired)
      };
    } catch (err: any) {
      console.error('[VoiceforcePromptService] Analysis failed:', err.message);
      return {
        summary: 'Call concluded successfully.',
        sentiment: 'neutral',
        callOutcome: 'completed',
        actionItems: [],
        followUpRequired: false
      };
    }
  }
}
