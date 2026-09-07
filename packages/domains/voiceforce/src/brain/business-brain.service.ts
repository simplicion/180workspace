import { prisma } from '@workspace/db';
import { GuardrailEnforcementEngine } from '../guardrails/guardrail-enforcement.engine';

export interface BrainCompilationOptions {
  voiceAgentId?: string;
  companyId: string;
  recipientPhone?: string;
  agentPrompt?: string;
  campaignId?: string;
  campaignGoal?: string;
  specialOffer?: string;
}

export class BusinessBrainService {
  /**
   * Compiles live enterprise business context, offering pricing, customer CRM history, 
   * campaign objectives, and dedicated RAG knowledge guidelines into the agent's prompt.
   */
  static async compileSystemPrompt(
    arg1: string | BrainCompilationOptions,
    arg2?: string,
    arg3?: string
  ): Promise<string> {
    let voiceAgentId: string | undefined;
    let companyId: string;
    let recipientPhone: string | undefined;
    let fallbackPrompt: string | undefined;
    let campaignId: string | undefined;
    let campaignGoal: string | undefined;
    let specialOffer: string | undefined;

    if (typeof arg1 === 'object' && arg1 !== null) {
      voiceAgentId = arg1.voiceAgentId;
      companyId = arg1.companyId;
      recipientPhone = arg1.recipientPhone;
      fallbackPrompt = arg1.agentPrompt;
      campaignId = arg1.campaignId;
      campaignGoal = arg1.campaignGoal;
      specialOffer = arg1.specialOffer;
    } else {
      voiceAgentId = arg1 as string;
      companyId = arg2 as string;
      recipientPhone = arg3;
    }

    const [agent, company, offerings, pastCalls, clientRecord, campaignRecord, linkedVaultLinks] = await Promise.all([
      voiceAgentId
        ? (prisma as any).voiceAgent.findUnique({
            where: { id: voiceAgentId },
            include: { guardrail: true }
          }).catch(() => null)
        : null,
      (prisma as any).company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          oneLineDescription: true,
          country: true,
          currencySymbol: true,
          website: true
        }
      }).catch(() => null),
      (prisma as any).companyOffering.findMany({
        where: { companyId },
        select: {
          name: true,
          startingPrice: true,
          description: true
        },
        take: 30
      }).catch(() => []),
      recipientPhone
        ? (prisma as any).callSession.findMany({
            where: { companyId, recipientPhone, status: 'completed' },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              summary: true,
              callOutcome: true,
              createdAt: true
            }
          }).catch(() => [])
        : [],
      recipientPhone
        ? (prisma as any).client.findFirst({
            where: {
              companyId,
              phone: { contains: recipientPhone.slice(-10) }
            },
            select: {
              name: true,
              companyName: true,
              status: true
            }
          }).catch(() => null)
        : null,
      campaignId
        ? (prisma as any).callCampaign.findUnique({
            where: { id: campaignId },
            select: {
              name: true,
              objective: true,
              campaignGoal: true,
              specialOffer: true
            }
          }).catch(() => null)
        : null,
      voiceAgentId && (prisma as any).voiceAgentVaultLink?.findMany
        ? (prisma as any).voiceAgentVaultLink.findMany({
            where: { voiceAgentId },
            include: { vault: true }
          }).catch(() => [])
        : []
    ]);

    const activeVaults = (linkedVaultLinks || []).map((l: any) => l.vault).filter(Boolean);
    const vaultDirectives = activeVaults.map((v: any) => {
      let text = `• Vault "${v.name}" (${v.category || 'General'}):`;
      if (v.purposeDescription) text += ` ${v.purposeDescription}`;
      return text;
    });

    const vaultSection = vaultDirectives.length > 0
      ? `\nLINKED RAG KNOWLEDGE VAULTS:\n${vaultDirectives.join('\n')}\n(Use "search_business_knowledge" to query deep facts from these vaults.)\n`
      : '';

    const currency = company?.currencySymbol || '$';
    const catalogList = (offerings || []).map((o: any) => {
      const priceStr = o.startingPrice ? `${currency}${o.startingPrice}` : 'Custom quote';
      return `- ${o.name}: ${priceStr} (${o.description || 'Standard offering'})`;
    });

    const catalogSection = catalogList.length > 0
      ? `OFFICIAL PRODUCTS, SERVICES & PRICING CATALOG (AUTHORITATIVE TRUTH):\n${catalogList.join('\n')}`
      : `OFFICIAL PRODUCTS & SERVICES:\nStandard business services apply.`;

    const clientSection = clientRecord
      ? `\nCUSTOMER RECOGNITION (VERIFIED CRM CLIENT):\n` +
        `Customer Name: ${clientRecord.name}\n` +
        `Company: ${clientRecord.companyName || 'Individual'}\n` +
        `Client Status: ${clientRecord.status || 'Active'}\n`
      : '';

    const historySection = pastCalls && pastCalls.length > 0
      ? `\nPREVIOUS CONVERSATIONS WITH THIS PHONE NUMBER:\n` +
        pastCalls
          .map(
            (c: any) =>
              `• [${new Date(c.createdAt).toLocaleDateString()} - Outcome: ${c.callOutcome || 'completed'}]: ${c.summary}`
          )
          .join('\n')
      : '';

    // 50MB Scoped RAG Caller-ID Lookup (Matches phone in customer directories, interaction logs, or uploaded files)
    let ragCustomerSection = '';
    if (recipientPhone && activeVaults.length > 0) {
      const cleanDigits = recipientPhone.replace(/\D/g, '').slice(-10);
      if (cleanDigits.length >= 7) {
        try {
          const matchingChunks = await (prisma as any).knowledgeChunk.findMany({
            where: {
              vaultId: { in: activeVaults.map((v: any) => v.id) },
              content: { contains: cleanDigits }
            },
            take: 3,
            select: { content: true }
          });
          if (matchingChunks && matchingChunks.length > 0) {
            ragCustomerSection = `\nMATCHED CUSTOMER DOSSIER & PREVIOUS INTERACTIONS FROM 50MB RAG VAULT (PHONE: ${recipientPhone}):\n` +
              matchingChunks.map((m: any) => `• ${m.content}`).join('\n') + '\n';
          }
        } catch {
          // Non-blocking fallback
        }
      }
    }

    // Active Campaign & Strategic Objectives
    const activeGoal = campaignGoal || campaignRecord?.campaignGoal || campaignRecord?.objective;
    const activeOffer = specialOffer || campaignRecord?.specialOffer;
    const campaignSection = (activeGoal || activeOffer)
      ? `\nACTIVE CAMPAIGN & PROMOTIONAL DIRECTIVES:\n` +
        (activeGoal ? `• Campaign Objective: ${activeGoal}\n` : '') +
        (activeOffer ? `• Special Offer / Promotion: ${activeOffer}\n` : '')
      : '';

    const basePrompt = agent?.systemPrompt || fallbackPrompt || 'You are an autonomous AI voice employee for this company.';
    const guardrailDirectives = GuardrailEnforcementEngine.compileGuardrailsToPrompt(agent?.guardrail?.rules);

    return `${basePrompt}\n\n` +
      `COMPANY CONTEXT:\n` +
      `Business Name: ${company?.name || 'Our Company'}\n` +
      `Description: ${company?.oneLineDescription || 'Enterprise Solutions'}\n` +
      `Country: ${company?.country || 'India'}\n\n` +
      `${catalogSection}\n` +
      vaultSection +
      campaignSection +
      clientSection +
      historySection +
      ragCustomerSection +
      guardrailDirectives +
      `\nCRITICAL CONVERSATIONAL & ACCURACY RULES:\n` +
      `1. ALWAYS use the exact product names and pricing listed above. Never invent discounts, special deals, or modified rates unless explicitly authorized in the Active Campaign section.\n` +
      `2. KNOWLEDGE BASE SEARCH: You have access to the company's uploaded documents, PDF manuals, warranty terms, and technical catalogs via the "search_business_knowledge" tool. If a customer asks a detailed question, policy detail, or specific inquiry not in your primary prompt, use "search_business_knowledge" immediately to get the exact answer.\n` +
      `3. Keep responses conversational, natural, and concise (1 to 2 sentences per response). Never speak bullet points, markdown symbols, asterisks, or URLs over the phone.\n` +
      `4. When the customer confirms an action (e.g., booking an appointment or creating a CRM record), execute the tool immediately and speak the confirmation to them.\n` +
      `5. OPENING DISCLOSURE: Speak any opening compliance statement briskly, crisply, and naturally without long pauses before smoothly transitioning to the purpose of your call.\n` +
      `6. OPT-OUT & STOP CALLING REQUESTS: If the customer requests not to be called again, asks to be removed, or expresses that they do not want calls, immediately apologize for the interruption, confirm: "I understand completely. I have marked your number on our Do-Not-Call list and you will not be contacted again. Have a great day," and conclude the call.\n` +
      `7. SCHEDULING & MEETING BOOKINGS: When a customer or caller requests to schedule or book a meeting, inspection, demo, or consultation with our team (e.g. "schedule a meeting with your team", "book an appointment for me"), politely collect their name, preferred date and time, phone/email, and purpose. Then execute the "book_appointment" or "request_orbit_meeting_booking" tool to register the meeting in our calendar and push the request to Orbit AI for immediate team synchronization. Once executed, verbally confirm the scheduled date and time to the caller.`;
  }
}

