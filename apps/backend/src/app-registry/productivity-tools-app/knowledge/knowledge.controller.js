const { prisma } = require('@workspace/db');

// Get all articles (with Search)
exports.getArticles = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { search, category } = req.query;

        const where = { companyId };

        if (category && category !== 'All') {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { title: { search: search } },
                { content: { search: search } }
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

        res.json({ success: true, articles });
    } catch (error) {
        console.error("Error fetching knowledge articles:", error);
        res.status(500).json({ success: false, message: "Failed to fetch articles" });
    }
};

// Get a single article
exports.getArticleById = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const article = await prisma.knowledgeArticle.findFirst({
            where: { id, companyId },
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

        if (!article) return res.status(404).json({ success: false, message: "Article not found" });

        res.json({ success: true, article });
    } catch (error) {
        console.error("Error fetching article:", error);
        res.status(500).json({ success: false, message: "Failed to fetch article" });
    }
};

// Create article
exports.createArticle = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { title, content, category, tags } = req.body;

        const article = await prisma.knowledgeArticle.create({
            data: {
                title: title || 'Untitled Document',
                content: content || '',
                category: category || 'General',
                tags: tags || [],
                companyId,
                createdById: userId,
                updatedById: userId
            }
        });

        res.json({ success: true, article });
    } catch (error) {
        console.error("Error creating article:", error);
        res.status(500).json({ success: false, message: "Failed to create article" });
    }
};

// Update article
exports.updateArticle = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { id } = req.params;
        const { title, content, category, tags, saveVersion } = req.body;

        const existing = await prisma.knowledgeArticle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ success: false, message: "Article not found" });

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
                const toDelete = versions.slice(2).map(v => v.id);
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

        res.json({ success: true, article });
    } catch (error) {
        console.error("Error updating article:", error);
        res.status(500).json({ success: false, message: "Failed to update article" });
    }
};

// Lock article for editing
exports.lockArticle = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { id } = req.params;

        const article = await prisma.knowledgeArticle.findFirst({ where: { id, companyId } });
        if (!article) return res.status(404).json({ success: false, message: "Article not found" });

        const now = new Date();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);
        
        if (article.lockedById && article.lockedById !== userId && article.lockedAt > fifteenMinsAgo) {
            return res.status(403).json({ 
                success: false, 
                message: "Article is currently being edited by someone else",
                lockedById: article.lockedById
            });
        }

        await prisma.knowledgeArticle.update({
            where: { id },
            data: {
                lockedById: userId,
                lockedAt: new Date()
            }
        });

        res.json({ success: true, message: "Lock acquired" });
    } catch (error) {
        console.error("Error locking article:", error);
        res.status(500).json({ success: false, message: "Failed to lock article" });
    }
};

// Unlock article
exports.unlockArticle = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { id } = req.params;

        const article = await prisma.knowledgeArticle.findFirst({ where: { id, companyId } });
        if (!article) return res.status(404).json({ success: false, message: "Article not found" });

        if (article.lockedById === userId) {
            await prisma.knowledgeArticle.update({
                where: { id },
                data: {
                    lockedById: null,
                    lockedAt: null
                }
            });
        }

        res.json({ success: true, message: "Lock released" });
    } catch (error) {
        console.error("Error unlocking article:", error);
        res.status(500).json({ success: false, message: "Failed to unlock article" });
    }
};

// Delete article
exports.deleteArticle = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const existing = await prisma.knowledgeArticle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ success: false, message: "Article not found" });

        await prisma.knowledgeArticle.delete({ where: { id } });

        res.json({ success: true, message: "Article deleted" });
    } catch (error) {
        console.error("Error deleting article:", error);
        res.status(500).json({ success: false, message: "Failed to delete article" });
    }
};

// Create a link
exports.createLink = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { relatedModel, relatedId } = req.body;

        const existing = await prisma.knowledgeArticle.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ success: false, message: "Article not found" });

        const link = await prisma.knowledgeArticleLink.create({
            data: {
                articleId: id,
                relatedModel,
                relatedId
            }
        });

        res.json({ success: true, link });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: "Link already exists" });
        }
        console.error("Error creating link:", error);
        res.status(500).json({ success: false, message: "Failed to create link" });
    }
};

// Get links for a specific relatedId
exports.getLinksForEntity = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { relatedModel, relatedId } = req.query;

        const links = await prisma.knowledgeArticleLink.findMany({
            where: {
                relatedModel,
                relatedId,
                article: { companyId }
            },
            include: {
                article: {
                    select: { id: true, title: true, category: true, updatedAt: true }
                }
            }
        });

        res.json({ success: true, links });
    } catch (error) {
        console.error("Error fetching links:", error);
        res.status(500).json({ success: false, message: "Failed to fetch links" });
    }
};
