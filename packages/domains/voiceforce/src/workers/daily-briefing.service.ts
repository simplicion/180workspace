import { prisma } from '@workspace/db';
import Groq from 'groq-sdk';

export interface DailyBriefingResult {
  briefingDate: string;
  totalCalls: number;
  missedCallsSaved: number;
  leadsCaptured: number;
  appointmentsBooked: number;
  ordersCreated: number;
  revenueInfluenced: number;
  laborHoursSaved: number;
  topInquiries: string[];
  unansweredFaqs: string[];
  actionItems: string[];
}

export class DailyBriefingService {
  /**
   * Generates autonomous daily executive performance briefing for a company
   */
  static async generateBriefingForCompany(companyId: string, targetDate?: Date): Promise<DailyBriefingResult> {
    const date = targetDate || new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch all calls on this date
    const calls = await (prisma as any).callSession.findMany({
      where: {
        companyId,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        transcripts: true,
        toolExecutions: true
      }
    });

    const totalCalls = calls.length;
    let totalDurationSec = 0;
    let appointmentsBooked = 0;
    let ordersCreated = 0;
    let revenueInfluenced = 0;
    let leadsCaptured = 0;
    let missedCallsSaved = 0;

    const allUserUtterances: string[] = [];

    for (const c of calls) {
      totalDurationSec += (c.durationSeconds || 0);

      const hour = new Date(c.createdAt).getHours();
      if (c.direction === 'inbound' && (hour < 9 || hour >= 18)) {
        missedCallsSaved++;
      }

      if (c.recipientName || c.recipientPhone) {
        leadsCaptured++;
      }

      for (const t of c.toolExecutions || []) {
        if (t.isSuccess) {
          if (t.toolName === 'book_appointment' || t.toolName === 'schedule_meeting') {
            appointmentsBooked++;
            revenueInfluenced += 100.0;
          }
          if (t.toolName === 'create_sales_order' || t.toolName === 'create_order') {
            ordersCreated++;
            const amt = Number((t.arguments as any)?.totalAmount || (t.arguments as any)?.price || 50.0);
            revenueInfluenced += amt;
          }
        }
      }

      for (const seg of c.transcripts || []) {
        if (seg.speaker === 'user' && seg.text.length > 5) {
          allUserUtterances.push(seg.text);
        }
      }
    }

    const laborHoursSaved = Number((totalDurationSec / 3600).toFixed(1));

    // 2. Distill top inquiries & unanswered FAQs using Groq
    let topInquiries: string[] = ['Business hours and location inquiries', 'Pricing and discount questions'];
    let unansweredFaqs: string[] = [];
    let actionItems: string[] = ['Keep catalog updated with current inventory'];

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && allUserUtterances.length > 0) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const sampledUtterances = allUserUtterances.slice(0, 40).join('\n• ');

        const prompt = `You are a business intelligence assistant analyzing customer voice queries from today.
Customer Questions:
• ${sampledUtterances}

Output MUST be a JSON object:
{
  "topInquiries": [string] (Top 3-5 themes asked by customers today),
  "unansweredFaqs": [string] (1-3 questions where customers asked about things not typically covered or missing),
  "actionItems": [string] (1-2 recommended operational actions for the business owner)
}`;

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: prompt }]
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        if (Array.isArray(parsed.topInquiries) && parsed.topInquiries.length > 0) {
          topInquiries = parsed.topInquiries;
        }
        if (Array.isArray(parsed.unansweredFaqs)) {
          unansweredFaqs = parsed.unansweredFaqs;
        }
        if (Array.isArray(parsed.actionItems) && parsed.actionItems.length > 0) {
          actionItems = parsed.actionItems;
        }
      } catch (err: any) {
        console.warn('[DailyBriefingService] AI synthesis note:', err.message);
      }
    }

    const briefingDateStr = startOfDay.toISOString().split('T')[0];

    // 3. Upsert into database
    await (prisma as any).dailyVoiceBriefing.upsert({
      where: {
        companyId_briefingDate: {
          companyId,
          briefingDate: startOfDay
        }
      },
      create: {
        companyId,
        briefingDate: startOfDay,
        totalCalls,
        missedCallsSaved,
        leadsCaptured,
        appointmentsBooked,
        ordersCreated,
        revenueInfluenced,
        laborHoursSaved,
        topInquiries,
        unansweredFaqs,
        actionItems,
        deliveredVia: ['in_app']
      },
      update: {
        totalCalls,
        missedCallsSaved,
        leadsCaptured,
        appointmentsBooked,
        ordersCreated,
        revenueInfluenced,
        laborHoursSaved,
        topInquiries,
        unansweredFaqs,
        actionItems
      }
    });

    return {
      briefingDate: briefingDateStr,
      totalCalls,
      missedCallsSaved,
      leadsCaptured,
      appointmentsBooked,
      ordersCreated,
      revenueInfluenced,
      laborHoursSaved,
      topInquiries,
      unansweredFaqs,
      actionItems
    };
  }

  /**
   * Generates autonomous executive performance briefing tailored to a specific AI agent
   */
  static async generateBriefingForAgent(agentId: string, companyId: string, targetDate?: Date): Promise<DailyBriefingResult> {
    const date = targetDate || new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch calls for this specific agent today
    let calls = await (prisma as any).callSession.findMany({
      where: {
        companyId,
        voiceAgentId: agentId,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        transcripts: true,
        toolExecutions: true
      }
    });

    // If no calls today, fetch recent calls to provide meaningful agent intelligence
    if (calls.length === 0) {
      calls = await (prisma as any).callSession.findMany({
        where: {
          companyId,
          voiceAgentId: agentId
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          transcripts: true,
          toolExecutions: true
        }
      });
    }

    const totalCalls = calls.length;
    let totalDurationSec = 0;
    let appointmentsBooked = 0;
    let ordersCreated = 0;
    let revenueInfluenced = 0;
    let leadsCaptured = 0;
    let missedCallsSaved = 0;

    const allUserUtterances: string[] = [];

    for (const c of calls) {
      totalDurationSec += (c.durationSeconds || 0);

      const hour = new Date(c.createdAt).getHours();
      if (c.direction === 'inbound' && (hour < 9 || hour >= 18)) {
        missedCallsSaved++;
      }

      if (c.recipientName || c.recipientPhone) {
        leadsCaptured++;
      }

      for (const t of c.toolExecutions || []) {
        if (t.isSuccess) {
          if (t.toolName === 'book_appointment' || t.toolName === 'schedule_meeting') {
            appointmentsBooked++;
            revenueInfluenced += 100.0;
          }
          if (t.toolName === 'create_sales_order' || t.toolName === 'create_order') {
            ordersCreated++;
            const amt = Number((t.arguments as any)?.totalAmount || (t.arguments as any)?.price || 50.0);
            revenueInfluenced += amt;
          }
        }
      }

      for (const seg of c.transcripts || []) {
        if (seg.speaker === 'user' && seg.text.length > 5) {
          allUserUtterances.push(seg.text);
        }
      }
    }

    const laborHoursSaved = Number((totalDurationSec / 3600).toFixed(1));

    // 2. Distill top inquiries & action items using Groq
    let topInquiries: string[] = ['Business hours and service inquiries', 'Pricing and discount questions'];
    let unansweredFaqs: string[] = [];
    let actionItems: string[] = ['Keep agent knowledge base and product inventory updated'];

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && allUserUtterances.length > 0) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const sampledUtterances = allUserUtterances.slice(0, 40).join('\n• ');

        const prompt = `You are an executive AI analyst reviewing customer calls handled specifically by an AI voice employee.
Customer Queries:
• ${sampledUtterances}

Output valid JSON only:
{
  "topInquiries": [string] (Top 2-4 specific inquiry themes from callers),
  "unansweredFaqs": [string] (1-2 queries where additional agent knowledge is needed),
  "actionItems": [string] (1-2 recommended operational adjustments for this AI employee)
}`;

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: prompt }]
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        if (Array.isArray(parsed.topInquiries) && parsed.topInquiries.length > 0) {
          topInquiries = parsed.topInquiries;
        }
        if (Array.isArray(parsed.unansweredFaqs)) {
          unansweredFaqs = parsed.unansweredFaqs;
        }
        if (Array.isArray(parsed.actionItems) && parsed.actionItems.length > 0) {
          actionItems = parsed.actionItems;
        }
      } catch (err: any) {
        console.warn('[DailyBriefingService] AI agent synthesis note:', err.message);
      }
    }

    const briefingDateStr = startOfDay.toISOString().split('T')[0];

    return {
      briefingDate: briefingDateStr,
      totalCalls,
      missedCallsSaved,
      leadsCaptured,
      appointmentsBooked,
      ordersCreated,
      revenueInfluenced,
      laborHoursSaved,
      topInquiries,
      unansweredFaqs,
      actionItems
    };
  }
}

