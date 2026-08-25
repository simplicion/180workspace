import { prisma, requestContext } from '@workspace/db';
export class DocumentService {
    static async getAllDocuments() {
        // Fetch all documents and contracts from knowledgeArticle table
        const articles = await prisma.knowledgeArticle.findMany({
            where: {},
            include: {
                createdBy: { select: { id: true, name: true, photoUrl: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const combined = articles.map((a: any) => {
            let parsed: any = null;
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
        combined.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return combined;
    }

    static async getDocumentsList(search?: string, category?: string) {
        const where: any = {};

        if (category && category !== 'All') {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } }
            ];
        }

        const articles = await prisma.knowledgeArticle.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, photoUrl: true } },
                updatedBy: { select: { id: true, name: true, photoUrl: true } },
                lockedBy: { select: { id: true, name: true, photoUrl: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return articles;
    }

    static async getDocumentById(id: string) {
        const article = await prisma.knowledgeArticle.findFirst({
            where: { id },
            include: {
                createdBy: { select: { id: true, name: true, photoUrl: true } },
                updatedBy: { select: { id: true, name: true, photoUrl: true } },
                lockedBy: { select: { id: true, name: true, photoUrl: true } },
                links: true,
                versions: {
                    orderBy: { createdAt: 'desc' },
                    take: 2,
                    include: { createdBy: { select: { id: true, name: true } } }
                }
            }
        });

        return article;
    }

    static async createDocument(userId: string, data: any) {
        const { title, content, category, tags } = data;

        const companyId = requestContext.getStore()?.companyId as string;
        const article = await prisma.knowledgeArticle.create({
            data: {
                companyId,
                title: title || 'Untitled Document',
                content: content || '',
                category: category || 'General',
                tags: tags || [],
                createdById: userId,
                updatedById: userId
            }
        });

        return article;
    }

    static async updateDocument(userId: string, id: string, data: any) {
        const { title, content, category, tags, saveVersion } = data;

        const existing = await prisma.knowledgeArticle.findFirst({ where: { id } });
        if (!existing) throw new Error("Article not found");

        if (saveVersion && existing.content !== content) {
            await prisma.knowledgeArticleVersion.create({
                data: {
                    articleId: id,
                    content: existing.content,
                    changeSummary: 'Auto-saved before major update',
                    createdById: userId
                }
            });

            const versions = await prisma.knowledgeArticleVersion.findMany({
                where: { articleId: id },
                orderBy: { createdAt: 'desc' }
            });
            if (versions.length > 2) {
                const toDelete = versions.slice(2).map((v: any) => v.id);
                await prisma.knowledgeArticleVersion.deleteMany({
                    where: { id: { in: toDelete } }
                });
            }
        }

        const article = await prisma.knowledgeArticle.update({
            where: { id },
            data: {
                title: title ?? existing.title,
                content: content ?? existing.content,
                category: category ?? existing.category,
                tags: tags ?? existing.tags,
                updatedById: userId
            }
        });

        return article;
    }

    static async lockDocument(userId: string, id: string) {
        const article = await prisma.knowledgeArticle.findFirst({ where: { id } });
        if (!article) throw new Error("Article not found");

        const now = new Date();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);
        
        if (article.lockedById && article.lockedById !== userId && article.lockedAt > fifteenMinsAgo) {
            throw new Error(`Article is currently being edited by someone else. Locked by: ${article.lockedById}`);
        }

        await prisma.knowledgeArticle.update({
            where: { id },
            data: {
                lockedById: userId,
                lockedAt: new Date()
            }
        });
        return { message: "Lock acquired" };
    }

    static async unlockDocument(userId: string, id: string) {
        const article = await prisma.knowledgeArticle.findFirst({ where: { id } });
        if (!article) throw new Error("Article not found");

        if (article.lockedById === userId) {
            await prisma.knowledgeArticle.update({
                where: { id },
                data: {
                    lockedById: null,
                    lockedAt: null
                }
            });
        }
        return { message: "Lock released" };
    }

    static async deleteDocument(id: string) {
        const existing = await prisma.knowledgeArticle.findFirst({ where: { id } });
        if (!existing) throw new Error("Article not found");

        await prisma.knowledgeArticle.delete({ where: { id } });
        return { message: "Article deleted" };
    }

    static async createLink(id: string, relatedModel: string, relatedId: string) {
        const existing = await prisma.knowledgeArticle.findFirst({ where: { id } });
        if (!existing) throw new Error("Article not found");

        try {
            const link = await prisma.knowledgeArticleLink.create({
                data: {
                    articleId: id,
                    relatedModel,
                    relatedId
                }
            });
            return link;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new Error("Link already exists");
            }
            throw error;
        }
    }

    static async getLinksForEntity(relatedModel: string, relatedId: string) {
        const links = await prisma.knowledgeArticleLink.findMany({
            where: {
                relatedModel,
                relatedId
            },
            include: {
                article: {
                    select: { id: true, title: true, category: true, updatedAt: true }
                }
            }
        });
        return links;
    }
}

