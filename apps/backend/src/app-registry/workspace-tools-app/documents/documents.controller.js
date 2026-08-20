'use strict';

const { DocumentService } = require('@workspace/workspace-tools');
const { prisma } = require('@workspace/db');

exports.getAllDocuments = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        
        const documents = await DocumentService.getAllDocuments(companyId);
        res.json({ success: true, documents });
    } catch (error) {
        console.error("Error fetching all documents:", error);
        res.status(500).json({ success: false, message: "Failed to fetch documents" });
    }
};

exports.getDocumentsList = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const { search, category } = req.query;

        const documents = await DocumentService.getDocumentsList(companyId, search, category);
        res.json({ success: true, article: documents, documents }); // Keeping 'article' for backward compatibility on FE if any
    } catch (error) {
        console.error("Error fetching documents list:", error);
        res.status(500).json({ success: false, message: "Failed to fetch documents" });
    }
};

exports.getDocumentById = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const { id } = req.params;

        const document = await DocumentService.getDocumentById(id, companyId);

        if (!document) return res.status(404).json({ success: false, message: "Document not found" });

        res.json({ success: true, article: document, document }); // Keeping 'article'
    } catch (error) {
        console.error("Error fetching document:", error);
        res.status(500).json({ success: false, message: "Failed to fetch document" });
    }
};

exports.createDocument = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const userId = req.user?.id;
        const data = req.body;

        const document = await DocumentService.createDocument(companyId, userId, data);

        res.json({ success: true, article: document, document });
    } catch (error) {
        console.error("Error creating document:", error);
        res.status(500).json({ success: false, message: "Failed to create document" });
    }
};

exports.updateDocument = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const userId = req.user?.id;
        const { id } = req.params;
        const data = req.body;

        const document = await DocumentService.updateDocument(companyId, userId, id, data);

        res.json({ success: true, article: document, document });
    } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update document" });
    }
};

exports.lockDocument = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const userId = req.user?.id;
        const { id } = req.params;

        const result = await DocumentService.lockDocument(companyId, userId, id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("Error locking document:", error);
        if (error.message.includes('currently being edited')) {
            return res.status(403).json({ 
                success: false, 
                message: error.message
            });
        }
        res.status(500).json({ success: false, message: error.message || "Failed to lock document" });
    }
};

exports.unlockDocument = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const userId = req.user?.id;
        const { id } = req.params;

        const result = await DocumentService.unlockDocument(companyId, userId, id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("Error unlocking document:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to unlock document" });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const { id } = req.params;

        const result = await DocumentService.deleteDocument(companyId, id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to delete document" });
    }
};

exports.createLink = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const { id } = req.params;
        const { relatedModel, relatedId } = req.body;

        const link = await DocumentService.createLink(companyId, id, relatedModel, relatedId);
        res.json({ success: true, link });
    } catch (error) {
        if (error.message === 'Link already exists') {
            return res.status(400).json({ success: false, message: "Link already exists" });
        }
        console.error("Error creating link:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create link" });
    }
};

exports.getLinksForEntity = async (req, res) => {
    try {
        
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const { relatedModel, relatedId } = req.query;

        const links = await DocumentService.getLinksForEntity(companyId, relatedModel, relatedId);
        res.json({ success: true, links });
    } catch (error) {
        console.error("Error fetching links:", error);
        res.status(500).json({ success: false, message: "Failed to fetch links" });
    }
};
