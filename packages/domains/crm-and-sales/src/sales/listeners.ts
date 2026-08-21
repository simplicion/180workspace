// @ts-nocheck
import { eventBus } from '@workspace/backend-infra';
const { prisma } = require('@workspace/db');

export function initializeCRMListeners() {
    eventBus.on('website.lead.captured', async ({ lead, website }) => {
        try {
            console.log(`[CRM] Received lead from website: ${website.name}`);
            
            // 1. Create Company (if provided)
            let companyId = null;
            if (lead.company) {
                const company = await prisma.company.create({
                    data: {
                        name: lead.company,
                        databaseConfigured: true,
                        isOnboardingComplete: false
                    }
                });
                companyId = company.id;
            }

            // 2. Create Contact (Client model)
            const client = await prisma.client.create({
                data: {
                    name: lead.name || 'Unknown',
                    email: lead.email || '',
                    phone: lead.phone || '',
                    companyId: companyId,
                    clientType: 'lead'
                }
            });

            // 3. Create Lead (Opportunity model mapped to Lead)
            const opportunity = await prisma.lead.create({
                data: {
                    title: `Website Lead: ${lead.name || 'Unknown'}`,
                    source: `Website: ${website.name}`,
                    clientId: client.id,
                    ownerId: website.owner,
                    stage: 'Lead',
                    tags: lead.utmData ? [lead.utmData] : []
                }
            });

            console.log(`[CRM] Successfully routed lead ${opportunity.id} into the Sales Pipeline for user ${website.owner}. Source: ${website.slug}`);
            
        } catch (error) {
            console.error('[CRM] Error processing website lead:', error);
        }
    });
}

export default initializeCRMListeners;





