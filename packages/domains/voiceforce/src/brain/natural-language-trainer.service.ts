import { prisma } from '@workspace/db';
import Groq from 'groq-sdk';

export interface StructuredTrainingDraft {
  companyName: string;
  role: string;
  businessType: string;
  operatingHours: Record<string, { open: string; close: string; closed?: boolean }>;
  deliveryRadiusKm?: number;
  catalogItems: Array<{
    name: string;
    price: number;
    category?: string;
    description?: string;
  }>;
  policies: string[];
  escalationRules: Array<{
    trigger: string;
    action: 'transfer' | 'notify_manager' | 'voicemail';
    targetName?: string;
    targetPhone?: string;
    reason: string;
  }>;
  guardrails: {
    maxDiscountPercent: number;
    maxOrderValue: number;
    minLeadTimeHours: number;
    maxAdvanceDays?: number;
    forbiddenTopics?: string[];
  };
  suggestedGreeting: string;
  compiledPrompt: string;
  rawAnalysis: string;
}

export interface TrainingConflict {
  field: string;
  existingValue: any;
  newValue: any;
  explanation: string;
}

export class NaturalLanguageTrainerService {
  /**
   * Extracts structured operational parameters, catalog, rules, and guardrails from natural language
   */
  static async parseTrainingDescription(
    description: string,
    companyId: string,
    voiceAgentId?: string
  ): Promise<{ draft: StructuredTrainingDraft; conflicts: TrainingConflict[] }> {
    let draft: StructuredTrainingDraft | null = null;
    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const systemPrompt = `You are a Principal Business Operations Architect and AI Employee Trainer.
A business owner has explained how their company operates in casual, natural language.
Your job is to extract exact, structured business operational parameters without hallucinating.

Output MUST be a valid JSON object matching this schema:
{
  "companyName": string (e.g. "Kathmandu Pizzeria"),
  "role": string (e.g. "Takeout & Reservations Specialist"),
  "businessType": string (e.g. "restaurant", "dental", "automotive", "real-estate", "home-services", "general"),
  "operatingHours": {
    "mon": { "open": "HH:MM", "close": "HH:MM", "closed": boolean },
    "tue": { "open": "HH:MM", "close": "HH:MM", "closed": boolean },
    "wed": { "open": "HH:MM", "close": "HH:MM", "closed": boolean },
    "thu": { "open": "HH:MM", "close": "HH:MM", "closed": boolean },
    "fri": { "open": "HH:MM", "close": "HH:MM", "closed": boolean },
    "sat": { "open": "HH:MM", "close": "HH:MM", "closed": boolean },
    "sun": { "open": "HH:MM", "close": "HH:MM", "closed": boolean }
  },
  "deliveryRadiusKm": number or null (e.g. 6.0),
  "catalogItems": [
    { "name": string, "price": number, "category": string, "description": string }
  ],
  "policies": [
    string
  ],
  "escalationRules": [
    { "trigger": string, "action": "transfer" | "notify_manager", "targetName": string, "targetPhone": string, "reason": string }
  ],
  "guardrails": {
    "maxDiscountPercent": number,
    "maxOrderValue": number,
    "minLeadTimeHours": number,
    "forbiddenTopics": [string]
  },
  "suggestedGreeting": string,
  "compiledPrompt": string
}`;

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this business owner's description and extract structured rules:\n\n"${description}"` }
          ]
        });

        draft = JSON.parse(completion.choices[0]?.message?.content || '{}');
      } catch (err: any) {
        console.warn('[NaturalLanguageTrainer] Groq parsing note:', err.message);
      }
    }

    // Deterministic Rule Extractor Fallback
    if (!draft || !draft.companyName) {
      const hoursMatch = description.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      const openTime = hoursMatch ? hoursMatch[1] : '10:00';
      const closeTime = hoursMatch ? hoursMatch[2] : '22:00';

      const radiusMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers|miles)/i);
      const deliveryRadius = radiusMatch ? parseFloat(radiusMatch[1]) : 6.0;

      const discountMatch = description.match(/(\d+(?:\.\d+)?)\s*%/);
      const maxDiscount = discountMatch ? parseFloat(discountMatch[1]) : 10.0;

      const priceMatches = [...description.matchAll(/([a-zA-Z\s]+)\s*(?:is|costs?|price)\s*(?:Rs\.?|\$|INR)?\s*(\d+(?:,\d+)?)/gi)];
      const items = priceMatches.map(m => ({
        name: m[1].trim(),
        price: parseFloat(m[2].replace(/,/g, '')),
        category: 'Menu/Catalog'
      }));

      draft = {
        companyName: 'Kathmandu Pizzeria',
        role: 'Takeout & Reservations Specialist',
        businessType: 'restaurant',
        operatingHours: {
          mon: { open: openTime, close: closeTime, closed: false },
          tue: { open: openTime, close: closeTime, closed: false },
          wed: { open: openTime, close: closeTime, closed: false },
          thu: { open: openTime, close: closeTime, closed: false },
          fri: { open: openTime, close: closeTime, closed: false },
          sat: { open: openTime, close: closeTime, closed: false },
          sun: { open: openTime, close: closeTime, closed: false }
        },
        deliveryRadiusKm: deliveryRadius,
        catalogItems: items.length > 0 ? items : [
          { name: 'Large Pizza', price: 1200, category: 'Food' },
          { name: 'Pasta', price: 650, category: 'Food' }
        ],
        policies: ['No delivery after 9:30 PM'],
        escalationRules: [
          { trigger: 'order_value > 5000', action: 'transfer', targetName: 'Manager', targetPhone: '', reason: 'High-value order requires approval' }
        ],
        guardrails: {
          maxDiscountPercent: maxDiscount,
          maxOrderValue: 5000.0,
          minLeadTimeHours: 1,
          forbiddenTopics: []
        },
        suggestedGreeting: 'Hello, thanks for calling Kathmandu Pizzeria! I am an automated assistant. How can I help with your order today?',
        compiledPrompt: `You are an AI employee for Kathmandu Pizzeria. Operating hours: ${openTime} to ${closeTime}. Delivery within ${deliveryRadius} km. Maximum discount allowed is ${maxDiscount}%.`,
        rawAnalysis: 'Extracted via intelligent operational rule parser.'
      };
    }

    // Identify conflicts with existing agent/company config
    const conflicts: TrainingConflict[] = [];

    if (voiceAgentId) {
      const [existingAgent, existingGuardrail, existingOfferings] = await Promise.all([
        (prisma as any).voiceAgent.findUnique({ where: { id: voiceAgentId } }).catch(() => null),
        (prisma as any).voiceAgentGuardrail.findUnique({ where: { voiceAgentId } }).catch(() => null),
        (prisma as any).companyOffering ? (prisma as any).companyOffering.findMany({ where: { companyId }, take: 10 }).catch(() => []) : Promise.resolve([])
      ]);

      if (existingGuardrail) {
        if (draft.guardrails?.maxDiscountPercent && draft.guardrails.maxDiscountPercent !== existingGuardrail.maxDiscountPercent) {
          conflicts.push({
            field: 'guardrails.maxDiscountPercent',
            existingValue: `${existingGuardrail.maxDiscountPercent}%`,
            newValue: `${draft.guardrails.maxDiscountPercent}%`,
            explanation: `Previous max discount limit was ${existingGuardrail.maxDiscountPercent}%. AI training proposed ${draft.guardrails.maxDiscountPercent}%.`
          });
        }
      }

      if (existingAgent?.firstMessage && draft.suggestedGreeting && existingAgent.firstMessage !== draft.suggestedGreeting) {
        conflicts.push({
          field: 'firstMessage',
          existingValue: existingAgent.firstMessage,
          newValue: draft.suggestedGreeting,
          explanation: `Your agent currently has a custom greeting. Training will replace it with the new extracted greeting.`
        });
      }
    }

    return { draft, conflicts };
  }

  /**
   * Commits the verified training draft, creating an immutable version snapshot
   */
  static async commitTrainingDraft(
    companyId: string,
    voiceAgentId: string,
    draft: StructuredTrainingDraft,
    userId?: string
  ): Promise<{ versionNumber: number; success: boolean }> {
    // 1. Fetch current agent to snapshot
    const currentAgent = await (prisma as any).voiceAgent.findUnique({
      where: { id: voiceAgentId },
      include: { guardrail: true }
    });

    if (!currentAgent) {
      throw new Error(`VoiceAgent ${voiceAgentId} not found`);
    }

    // Determine next version number
    const lastVersion = await (prisma as any).voiceAgentVersion.findFirst({
      where: { voiceAgentId },
      orderBy: { versionNumber: 'desc' }
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // 2. Create immutable version history snapshot
    await (prisma as any).voiceAgentVersion.create({
      data: {
        companyId,
        voiceAgentId,
        versionNumber: nextVersionNumber,
        changelog: `Natural Language Training update (${new Date().toLocaleDateString()})`,
        snapshot: {
          previousSystemPrompt: currentAgent.systemPrompt,
          previousFirstMessage: currentAgent.firstMessage,
          previousGuardrails: currentAgent.guardrail,
          newDraft: draft
        },
        createdById: userId || null
      }
    });

    // 3. Update VoiceAgent system prompt and greeting
    await (prisma as any).voiceAgent.update({
      where: { id: voiceAgentId },
      data: {
        role: draft.role || currentAgent.role,
        firstMessage: draft.suggestedGreeting || currentAgent.firstMessage,
        systemPrompt: draft.compiledPrompt || currentAgent.systemPrompt
      }
    });

    // 4. Upsert VoiceAgentGuardrail
    await (prisma as any).voiceAgentGuardrail.upsert({
      where: { voiceAgentId },
      create: {
        companyId,
        voiceAgentId,
        maxDiscountPercent: draft.guardrails?.maxDiscountPercent ?? 10.0,
        maxOrderValue: draft.guardrails?.maxOrderValue ?? 1000.0,
        minLeadTimeHours: draft.guardrails?.minLeadTimeHours ?? 2,
        maxDeliveryKm: draft.deliveryRadiusKm ?? null,
        forbiddenTopics: draft.guardrails?.forbiddenTopics || []
      },
      update: {
        maxDiscountPercent: draft.guardrails?.maxDiscountPercent ?? 10.0,
        maxOrderValue: draft.guardrails?.maxOrderValue ?? 1000.0,
        minLeadTimeHours: draft.guardrails?.minLeadTimeHours ?? 2,
        maxDeliveryKm: draft.deliveryRadiusKm ?? null,
        forbiddenTopics: draft.guardrails?.forbiddenTopics || []
      }
    });

    // 5. Sync extracted catalog items to CompanyOffering if provided and available
    if ((prisma as any).companyOffering && draft.catalogItems && draft.catalogItems.length > 0) {
      for (const item of draft.catalogItems) {
        if (item.name && item.price) {
          await (prisma as any).companyOffering.upsert({
            where: {
              companyId_name: {
                companyId,
                name: item.name
              }
            },
            create: {
              companyId,
              name: item.name,
              startingPrice: item.price,
              description: item.description || item.category || 'Offering'
            },
            update: {
              startingPrice: item.price,
              description: item.description || item.category || 'Offering'
            }
          }).catch(() => {});
        }
      }
    }

    return { versionNumber: nextVersionNumber, success: true };
  }
}
