const { prisma } = require('@workspace/db');

exports.getDocuments = async (req, res, next) => {
    try {
        const documents = await prisma.documentPage.findMany({
            where: { published: true },
            select: {
                id: true,
                title: true,
                slug: true,
                category: true,
                updatedAt: true,
                createdAt: true
            }
        });

        // Group by category
        const groupedDocs = documents.reduce((acc, doc) => {
            if (!acc[doc.category]) {
                acc[doc.category] = [];
            }
            acc[doc.category].push({
                ...doc,
                _id: doc.id // backward compatibility mapping
            });
            return acc;
        }, {});

        res.json({ success: true, documents: groupedDocs });
    } catch (error) {
        next(error);
    }
};

exports.getDocumentBySlug = async (req, res, next) => {
    try {
        const doc = await prisma.documentPage.findFirst({
            where: { slug: req.params.slug, published: true },
            include: {
                createdBy: {
                    select: { name: true }
                }
            }
        });
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        res.json({
            success: true,
            document: {
                ...doc,
                _id: doc.id // backward compatibility mapping
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.createDocument = async (req, res, next) => {
    try {
        const { title, content, category, published } = req.body;
        
        // Auto-generate slug if not provided
        const slug = req.body.slug || title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        const doc = await prisma.documentPage.create({
            data: {
                title,
                slug,
                content,
                category: category || 'Other',
                published: published !== undefined ? published : true,
                createdById: req.user.id
            }
        });
        res.status(201).json({ success: true, document: doc });
    } catch (error) {
        next(error);
    }
};

exports.updateDocument = async (req, res, next) => {
    try {
        const docExists = await prisma.documentPage.findUnique({
            where: { id: req.params.id }
        });
        if (!docExists) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const data = { ...req.body };
        delete data.id;
        delete data._id;
        delete data.createdAt;
        delete data.updatedAt;

        if (data.title && !data.slug) {
            data.slug = data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
        }

        const doc = await prisma.documentPage.update({
            where: { id: req.params.id },
            data: {
                ...data,
                updatedById: req.user.id
            }
        });

        res.json({ success: true, document: doc });
    } catch (error) {
        next(error);
    }
};

exports.deleteDocument = async (req, res, next) => {
    try {
        const doc = await prisma.documentPage.findUnique({
            where: { id: req.params.id }
        });
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        await prisma.documentPage.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
