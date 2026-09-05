import { prisma } from '@workspace/db';

export class BusinessBrainService {
  /**
   * Compiles live enterprise business context, offering pricing, and customer history into the agent's prompt
   */
  static async compileSystemPrompt(
    arg1: string | { voiceAgentId?: string; companyId: string; recipientPhone?: string; agentPrompt?: string },
    arg2?: string,
    arg3?: string
  ): Promise<string> {
    let voiceAgentId: string | undefined;
    let companyId: string;
    let recipientPhone: string | undefined;
    let fallbackPrompt: string | undefined;

    if (typeof arg1 === 'object' && arg1 !== null) {
      voiceAgentId = arg1.voiceAgentId;
      companyId = arg1.companyId;
      recipientPhone = arg1.recipientPhone;
      fallbackPrompt = arg1.agentPrompt;
    } else {
      voiceAgentId = arg1 as string;
      companyId = arg2 as string;
      recipientPhone = arg3;
    }

    const [agent, company, offerings, pastCalls, clientRecord] = await Promise.all([
      voiceAgentId
        ? (prisma as any).voiceAgent.findUnique({
            where: { id: voiceAgentId }
          })
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
      }),
      (prisma as any).companyOffering.findMany({
        where: { companyId },
        select: {
          name: true,
          startingPrice: true,
          description: true
        },
        take: 20
      }),
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
          })
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
          })
        : null
    ]);

    const currency = company?.currencySymbol || '₹';
    const catalogList = (offerings || []).map((o: any) => {
      const priceStr = o.startingPrice ? `${currency}${o.startingPrice}` : 'Custom quote';
      return `- ${o.name}: ${priceStr} (${o.description || 'Standard offering'})`;
    });

    const catalogSection = catalogList.length > 0
      ? `OFFICIAL PRODUCTS, SERVICES & LIVE PRICING (AUTHORITATIVE TRUTH):\n${catalogList.join('\n')}`
      : `OFFICIAL PRODUCTS & SERVICES:\nStandard business consulting services apply.`;

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

    const basePrompt = agent?.systemPrompt || fallbackPrompt || 'You are an autonomous AI voice employee for this company.';

    return `${basePrompt}\n\n` +
      `COMPANY CONTEXT:\n` +
      `Business Name: ${company?.name || 'Our Company'}\n` +
      `Description: ${company?.oneLineDescription || 'Enterprise Solutions'}\n` +
      `Country: ${company?.country || 'India'}\n\n` +
      `${catalogSection}\n` +
      clientSection +
      historySection +
      `\nCRITICAL CONVERSATIONAL & ACCURACY RULES:\n` +
      `1. ALWAYS use the exact product names and pricing listed above. Never invent discounts, special deals, or modified rates.\n` +
      `2. If asked about a product or service not listed in your catalog, say politely: "We don't currently offer that, but I can connect you with our team."\n` +
      `3. Keep responses conversational, natural, and concise (1 to 2 sentences per response). Never speak bullet points, markdown symbols, asterisks, or URLs over the phone.\n` +
      `4. When the customer confirms an action (e.g., booking an appointment or creating a CRM record), execute the tool immediately and speak the confirmation to them.`;
  }
}
