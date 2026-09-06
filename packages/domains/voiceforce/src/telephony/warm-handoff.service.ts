import { prisma } from '@workspace/db';
import Groq from 'groq-sdk';

export interface ScreenPopPayload {
  callSessionId: string;
  customerName: string;
  callerNumber: string;
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  sentimentScore: number;
  coreIntent: string;
  summary: string;
  factsCollected: Record<string, any>;
  actionsPerformed: Array<{ tool: string; result: string }>;
  recommendedAction: string;
  startedAt: string;
  elapsedSeconds: number;
}

export class WarmHandoffService {
  /**
   * Generates a 3-second audio whisper transcript and synchronized screen-pop payload for a human agent
   */
  static async prepareHandoff(
    callSessionId: string,
    companyId: string,
    triggerReason: string = 'customer_request',
    targetPhone?: string,
    targetUserId?: string
  ): Promise<{ whisperText: string; screenPop: ScreenPopPayload }> {
    // 1. Fetch active call transcripts and tool executions
    const session = await (prisma as any).callSession.findUnique({
      where: { id: callSessionId },
      include: {
        transcripts: { orderBy: { startTimeMs: 'asc' } },
        toolExecutions: { orderBy: { createdAt: 'asc' } },
        voiceAgent: true
      }
    });

    if (!session) {
      throw new Error(`CallSession ${callSessionId} not found`);
    }

    const callerNumber = session.recipientPhone || 'Unknown Caller';
    const callerName = session.recipientName || 'Customer';

    // 2. Use Groq to distill conversation into a crisp 3-second whisper and briefing
    let whisperText = `Incoming transfer from ${session.voiceAgent?.name || 'AI'}. Customer on line.`;
    let screenPop: ScreenPopPayload = {
      callSessionId,
      customerName: callerName,
      callerNumber,
      sentiment: 'neutral',
      sentimentScore: 0.0,
      coreIntent: 'Assistance Needed',
      summary: 'Customer requested human assistance.',
      factsCollected: session.structuredData || {},
      actionsPerformed: (session.toolExecutions || []).map((t: any) => ({
        tool: t.toolName,
        result: t.isSuccess ? 'Success' : 'Failed'
      })),
      recommendedAction: 'Greet caller and confirm details.',
      startedAt: session.startedAt?.toISOString() || new Date().toISOString(),
      elapsedSeconds: session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000) : 0
    };

    const transcripts = session.transcripts || [];
    if (transcripts.length > 0) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const groq = new Groq({ apiKey: groqKey });
          const transcriptText = transcripts.map((t: any) => `${t.speaker}: ${t.text}`).join('\n');

          const prompt = `You are a real-time call center dispatch AI.
Analyze this call transcript between a customer and an AI assistant and produce an instant warm handoff briefing for a human supervisor.

Transcript:
${transcriptText}

Output MUST be a JSON object:
{
  "whisperMessage": string (EXACTLY 1 spoken sentence under 15 words. Example: "Transfer from Prince. Customer Rajesh is asking about delayed order 4812."),
  "customerName": string (e.g. "Rajesh" or "Customer"),
  "sentiment": "positive" | "neutral" | "frustrated" | "urgent",
  "sentimentScore": number between -1.0 and 1.0,
  "coreIntent": string (e.g. "Order Status Check"),
  "summary": string (1-2 concise sentences summarizing what happened),
  "factsCollected": object (e.g. {"orderId": "4812", "address": "Kathmandu"}),
  "recommendedAction": string (1 actionable step for the human agent)
}`;

          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: prompt }]
          });

          const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
          if (result.whisperMessage) whisperText = result.whisperMessage;
          if (result.summary) {
            screenPop = {
              ...screenPop,
              customerName: result.customerName || callerName,
              sentiment: result.sentiment || 'neutral',
              sentimentScore: result.sentimentScore ?? 0.0,
              coreIntent: result.coreIntent || 'Assistance Needed',
              summary: result.summary,
              factsCollected: { ...screenPop.factsCollected, ...(result.factsCollected || {}) },
              recommendedAction: result.recommendedAction || 'Greet caller and confirm details.'
            };
          }
        } catch (err: any) {
          console.warn('[WarmHandoffService] AI summarization note:', err.message);
        }
      }
    }

    // 3. Persist CallEscalationEvent in database
    await (prisma as any).callEscalationEvent.create({
      data: {
        companyId,
        callSessionId,
        targetType: targetPhone ? 'phone' : (targetUserId ? 'user' : 'department'),
        targetNumber: targetPhone || null,
        targetUserId: targetUserId || null,
        triggerReason,
        sentimentScore: screenPop.sentimentScore,
        whisperMessage: whisperText,
        briefingPayload: screenPop,
        status: 'initiated'
      }
    });

    return { whisperText, screenPop };
  }
}
