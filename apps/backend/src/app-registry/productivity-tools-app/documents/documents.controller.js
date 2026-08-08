'use strict';

const { prisma } = require('@workspace/db');

exports.getAllDocuments = async (req, res) => {
    try {
        const db = req.prisma || prisma;
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        
        // Fetch all documents and contracts from knowledgeArticle table
        const articles = await db.knowledgeArticle.findMany({
            where: { companyId },
            include: {
                createdBy: { select: { id: true, name: true, photoUrl: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const combined = articles.map(a => {
            let parsed = null;
            try {
                parsed = JSON.parse(a.content);
            } catch (e) {}

            const isContract = a.category === 'Contract' || (a.tags && a.tags.includes('contract')) || !!parsed?.blocks;
            
            return {
                id: a.id,
                _id: a.id,
                title: a.title,
                category: a.category || 'General',
                tags: a.tags || [],
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
                createdBy: a.createdBy,
                isArticle: !isContract,
                isContract: isContract,
                status: parsed?.status || 'Draft',
                type: isContract ? (parsed?.template === 'Sales Proposal' ? 'Project' : 'Contract') : (a.category || 'General'),
                clientName: parsed?.clientName || '',
                clientEmail: parsed?.clientEmail || '',
                blocks: parsed?.blocks || [],
                shareToken: parsed?.shareToken || '',
                signature: parsed?.signature || null,
                activityLog: parsed?.activityLog || [],
                validUntil: parsed?.validUntil || null,
                currency: parsed?.currency || 'INR'
            };
        });

        // Sort by date descending
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, documents: combined });
    } catch (error) {
        console.error("Error fetching all documents:", error);
        res.status(500).json({ success: false, message: "Failed to fetch documents" });
    }
};
