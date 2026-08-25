// @ts-nocheck
import crypto from 'crypto';
import { prisma } from '@workspace/db';

export class ContractService {
    static formatContract(article: any) {
        if (!article) return null;
        let parsed: any = {};
        try {
            parsed = typeof article.content === 'string' ? JSON.parse(article.content) : (article.content || {});
        } catch (e) {
            parsed = { text: article.content };
        }

        return {
            id: article.id,
            _id: article.id,
            title: article.title,
            company: article.companyId,
            createdBy: article.createdById,
            clientName: parsed.clientName || '',
            clientEmail: parsed.clientEmail || '',
            deal: parsed.dealId || null,
            variables: parsed.variables || {},
            validUntil: parsed.validUntil || null,
            showTotalAmount: parsed.showTotalAmount !== undefined ? parsed.showTotalAmount : true,
            requireNameToSign: parsed.requireNameToSign !== undefined ? parsed.requireNameToSign : true,
            currency: parsed.currency || 'INR',
            blocks: parsed.blocks || [],
            status: parsed.status || 'Draft',
            shareToken: parsed.shareToken || null,
            clientSignatureData: parsed.clientSignatureData || null,
            signature: parsed.signature || null,
            activityLog: parsed.activityLog || [],
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            isContract: true
        };
    }

  static async createContract(user: any, data: any, ip: string) {
        const { title, clientName, clientEmail, dealId, template } = data;
        const userId = user?.id;
        
        let initialBlocks: any[] = [];
        let variables: any = {};

        if (dealId) {
            try {
          const deal = await prisma.lead.findFirst({
            where: { id: dealId },
                    include: { contact: true, company: true }
                });
                if (deal) {
                    variables = {
                        clientName: deal.contact?.name || clientName || '',
                        clientEmail: deal.contact?.email || clientEmail || '',
                        clientCompany: deal.company?.name || '',
                        dealAmount: deal.amount ? String(deal.amount) : '',
                        dealName: deal.title || '',
                    };
                }
            } catch (err) {
                console.log('Error fetching CRM deal:', err);
            }
        }

        if (template === 'Web Development') {
            initialBlocks = [
                { id: crypto.randomUUID(), type: 'Heading', content: 'Scope of Work' },
                { id: crypto.randomUUID(), type: 'Scope', content: ['Design and development of the agreed website', 'Responsive layouts across devices', 'Testing and deployment'] },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Timeline' },
                { id: crypto.randomUUID(), type: 'Timeline', content: [{ milestone: 'Kickoff', date: '' }, { milestone: 'Development', date: '' }, { milestone: 'Launch', date: '' }] },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Payment Terms' },
                { id: crypto.randomUUID(), type: 'Terms', content: '50% Advance on signing\n50% Final on delivery' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Intellectual Property' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'All deliverables remain the property of the service provider until full payment is received. Upon final payment, ownership of the final deliverables transfers to the client. The service provider retains the right to display the work in their portfolio.' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Terms & Conditions' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'Client must provide feedback within 5 business days of each milestone delivery.\nAny scope changes must be agreed in writing and may affect the timeline and pricing.\nThis agreement is governed by the laws of India.' },
                { id: crypto.randomUUID(), type: 'Signature', content: 'By signing below, the client acknowledges and agrees to all terms and conditions in this contract.' }
            ];
        } else if (template === 'Freelance Service') {
            initialBlocks = [
                { id: crypto.randomUUID(), type: 'Heading', content: 'Services' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'This agreement is entered into between the service provider and the client for the provision of the services described below.' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Deliverables' },
                { id: crypto.randomUUID(), type: 'Scope', content: ['Deliverable 1', 'Deliverable 2', 'Deliverable 3'] },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Payment' },
                { id: crypto.randomUUID(), type: 'Terms', content: '50% Advance on signing\n50% Final on completion' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Ownership' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'Ownership of the final deliverables transfers to the client upon receipt of full payment. Until then, all work remains the property of the service provider.' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Terms & Conditions' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'Either party may terminate this agreement with written notice. Work completed up to the termination date will be invoiced and is payable by the client.\nThis agreement is governed by the laws of India.' },
                { id: crypto.randomUUID(), type: 'Signature', content: 'By signing below, the client acknowledges and agrees to all terms and conditions in this contract.' }
            ];
        } else if (template === 'NDA') {
            initialBlocks = [
                { id: crypto.randomUUID(), type: 'Heading', content: 'Non-Disclosure Agreement (NDA)' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'This Non-Disclosure Agreement is entered into by and between the Disclosing Party and the Receiving Party ({{clientName}}).' },
                { id: crypto.randomUUID(), type: 'Heading', content: '1. Definition of Confidential Information' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: '"Confidential Information" shall mean all information disclosed by the Disclosing Party to the Receiving Party, whether orally or in writing, that is designated as confidential.' },
                { id: crypto.randomUUID(), type: 'Heading', content: '2. Obligations of Receiving Party' },
                { id: crypto.randomUUID(), type: 'Scope', content: ['Maintain confidentiality of all information', 'Do not disclose to third parties without written consent', 'Use information solely for the purpose of the business relationship'] },
                { id: crypto.randomUUID(), type: 'Signature', content: 'By signing below, the parties agree to the terms of this Non-Disclosure Agreement.' }
            ];
        } else if (template === 'Marketing Retainer') {
            initialBlocks = [
                { id: crypto.randomUUID(), type: 'Heading', content: 'Marketing Agency Retainer' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'This retainer agreement defines the monthly marketing services provided for {{clientCompany}}.' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Monthly Deliverables' },
                { id: crypto.randomUUID(), type: 'Scope', content: ['4 SEO Blog Posts', 'Social Media Management (12 posts/month)', 'Monthly Performance Reporting'] },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Payment Terms' },
                { id: crypto.randomUUID(), type: 'Terms', content: 'Invoices will be sent on the 1st of every month.\nNet 15 Payment Terms apply.' },
                { id: crypto.randomUUID(), type: 'Signature', content: 'By signing below, the client agrees to this monthly retainer.' }
            ];
        } else if (template === 'Sales Proposal') {
            initialBlocks = [
                { id: crypto.randomUUID(), type: 'Heading', content: 'Proposal for {{clientCompany}}' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'Thank you for considering us. We are excited to present this proposal outlining our strategic approach and pricing.' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Our Solution' },
                { id: crypto.randomUUID(), type: 'Paragraph', content: 'We propose a comprehensive strategy designed to increase your revenue and optimize operations.' },
                { id: crypto.randomUUID(), type: 'Heading', content: 'Investment' },
                { id: crypto.randomUUID(), type: 'Pricing', content: 'Total Proposed Investment: {{dealAmount}}' },
                { id: crypto.randomUUID(), type: 'Signature', content: 'If you are ready to proceed, simply sign below to accept this proposal.' }
            ];
        } else {
            initialBlocks = [
                { id: crypto.randomUUID(), type: 'Signature', content: 'By signing below, the client acknowledges and agrees to all terms and conditions in this contract.' }
            ];
        }

        const contentData = {
            template: template || 'Blank',
            clientName: clientName || '',
            clientEmail: variables.clientEmail || clientEmail || '',
            dealId: dealId || null,
            variables,
            blocks: initialBlocks,
            status: 'Draft',
            validUntil: null,
            showTotalAmount: true,
            requireNameToSign: true,
            currency: 'INR',
            activityLog: [{ action: 'Created', timestamp: new Date(), details: 'Document created by ' + (user?.name || 'User'), ip }]
        };

        const article = await prisma.knowledgeArticle.create({
            data: {
                title: title || 'New Contract',
                content: JSON.stringify(contentData),
                category: 'Contract',
        tags: ['contract', template || 'custom'],
        createdById: userId
            }
        });

        return this.formatContract(article);
    }

  static async getContracts() {
    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        OR: [
                    { category: 'Contract' },
                    { tags: { has: 'contract' } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        return articles.map(this.formatContract);
    }

  static async getContract(id: string) {
    const article = await prisma.knowledgeArticle.findFirst({
      where: { id }
        });
        if (!article) throw new Error('Not found');
        return this.formatContract(article);
    }

  static async updateContract(user: any, id: string, data: any, ip: string) {
    const { title, clientName, clientEmail, validUntil, showTotalAmount, requireNameToSign, currency, blocks } = data;
    
    const article = await prisma.knowledgeArticle.findFirst({
      where: { id }
        });
        if (!article) throw new Error('Not found');
        
        let parsed: any = {};
        try {
            parsed = JSON.parse(article.content);
        } catch (e) {}

        if (parsed.status === 'Signed') {
            throw new Error('Cannot edit a signed contract');
        }

        if (clientName !== undefined) parsed.clientName = clientName;
        if (clientEmail !== undefined) parsed.clientEmail = clientEmail;
        if (validUntil !== undefined) parsed.validUntil = validUntil;
        if (showTotalAmount !== undefined) parsed.showTotalAmount = showTotalAmount;
        if (requireNameToSign !== undefined) parsed.requireNameToSign = requireNameToSign;
        if (currency !== undefined) parsed.currency = currency;
        if (blocks !== undefined) parsed.blocks = blocks;
        
        parsed.activityLog = parsed.activityLog || [];
        parsed.activityLog.push({ action: 'Updated', timestamp: new Date(), details: 'Document updated by ' + (user?.name || 'User'), ip });

        const updated = await prisma.knowledgeArticle.update({
            where: { id },
            data: {
                title: title !== undefined ? title : article.title,
                content: JSON.stringify(parsed),
                updatedById: user?.id
            }
        });

        return this.formatContract(updated);
    }

  static async deleteContract(id: string) {
    await prisma.knowledgeArticle.deleteMany({
      where: { id }
        });
    }

  static async generateShareLink(user: any, id: string, ip: string) {
    const article = await prisma.knowledgeArticle.findFirst({
      where: { id }
        });
        if (!article) throw new Error('Not found');

        let parsed: any = {};
        try {
            parsed = JSON.parse(article.content);
        } catch (e) {}

        if (!parsed.shareToken) {
            parsed.shareToken = crypto.randomBytes(20).toString('hex');
        }
        parsed.status = 'Sent';
        parsed.activityLog = parsed.activityLog || [];
        parsed.activityLog.push({ action: 'Sent', timestamp: new Date(), details: 'Link generated and sent to client', ip });

        await prisma.knowledgeArticle.update({
            where: { id },
            data: {
                content: JSON.stringify(parsed),
                updatedById: user?.id
            }
        });

        return parsed.shareToken;
    }

    static async getContractByToken(token: string, ip: string) {
        const articles = await prisma.knowledgeArticle.findMany({
            where: {
                OR: [
                    { category: 'Contract' },
                    { tags: { has: 'contract' } }
                ]
            }
        });

        const found = articles.find((a: any) => {
            try {
                const p = JSON.parse(a.content);
                return p.shareToken === token;
            } catch (e) {
                return false;
            }
        });

        if (!found) throw new Error('Contract not found');

        let parsed = JSON.parse(found.content);
        parsed.activityLog = parsed.activityLog || [];

        if (parsed.status === 'Sent') {
            parsed.status = 'Viewed';
            parsed.activityLog.push({ action: 'Viewed', timestamp: new Date(), details: 'Client viewed the document', ip });
            await prisma.knowledgeArticle.update({
                where: { id: found.id },
                data: { content: JSON.stringify(parsed) }
            });
        } else {
            parsed.activityLog.push({ action: 'Viewed', timestamp: new Date(), details: 'Client viewed the document', ip });
            await prisma.knowledgeArticle.update({
                where: { id: found.id },
                data: { content: JSON.stringify(parsed) }
            });
        }

        const contract = this.formatContract({ ...found, content: JSON.stringify(parsed) });
        if (contract) {
            delete (contract as any).activityLog;
        }

        return contract;
    }

    static async signContract(token: string, data: any, ip: string, userAgent: string, getIo: Function) {
        const { clientName, signatureData } = data;

        const articles = await prisma.knowledgeArticle.findMany({
            where: {
                OR: [
                    { category: 'Contract' },
                    { tags: { has: 'contract' } }
                ]
            }
        });

        const found = articles.find((a: any) => {
            try {
                const p = JSON.parse(a.content);
                return p.shareToken === token;
            } catch (e) {
                return false;
            }
        });

        if (!found) throw new Error('Contract not found');

        let parsed = JSON.parse(found.content);
        if (parsed.status === 'Signed') {
            throw new Error('Already signed');
        }

        parsed.status = 'Signed';
        parsed.clientName = clientName || parsed.clientName;
        if (signatureData) {
            parsed.clientSignatureData = signatureData;
        }
        parsed.signature = {
            signedAt: new Date(),
            signedBy: clientName || parsed.clientName || 'Client',
            ipAddress: ip,
            userAgent: userAgent
        };
        parsed.activityLog = parsed.activityLog || [];
        parsed.activityLog.push({ action: 'Signed', timestamp: new Date(), details: `Signed by ${parsed.signature.signedBy}`, ip });

        const updated = await prisma.knowledgeArticle.update({
            where: { id: found.id },
            data: { content: JSON.stringify(parsed) }
        });

        if (parsed.dealId) {
            try {
                await prisma.lead.update({
                    where: { id: parsed.dealId.toString() },
                    data: { stage: 'Closed Won' }
                });
            } catch (err) {
                console.warn('Failed to update deal status to Closed Won', err);
            }
        }

        try {
            const io = getIo();
            if (io) {
                io.to(`user:${found.createdById}`).emit('contract:signed', {
                    contractId: found.id,
                    title: found.title,
                    clientName: parsed.clientName
                });
            }
        } catch (err) {
            console.warn('Failed to emit socket event', err);
        }

        return this.formatContract(updated);
    }
}
