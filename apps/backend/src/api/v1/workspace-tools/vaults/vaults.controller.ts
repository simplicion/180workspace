import { Request, Response } from 'express';
import { prisma } from '@workspace/db';
import { DocumentChunker, EmbeddingEngine, HybridSearchService } from '@workspace/rag';

export const VaultsController = {
  /**
   * Create a new RAG Memory Vault (Mode 1: General vs Mode 2: Business-Driven)
   */
  async createVault(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const {
        name,
        purposeDescription,
        mode = 'general',
        category = 'General',
        visibility = 'public_voice',
        offeringsData,
        customerData,
        documentIds = []
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Vault name is required' });
      }

      // 1. Initialize Vault in Database
      const parsedOfferings = typeof offeringsData === 'string' ? JSON.parse(offeringsData || '[]') : (offeringsData || []);
      const parsedCustomers = typeof customerData === 'string' ? JSON.parse(customerData || '[]') : (customerData || []);
      const parsedDocIds: string[] = typeof documentIds === 'string' ? JSON.parse(documentIds || '[]') : (documentIds || []);

      const vault = await (prisma as any).ragMemoryVault.create({
        data: {
          companyId,
          name: name.trim(),
          purposeDescription: purposeDescription ? purposeDescription.trim() : null,
          mode: mode === 'business_driven' ? 'business_driven' : 'general',
          category: category || 'General',
          visibility: visibility || 'public_voice',
          offeringsData: parsedOfferings,
          customerData: parsedCustomers,
          status: 'processing',
          progressPercent: 15,
          totalDocuments: parsedDocIds.length,
          totalChunks: 0
        }
      });

      // 2. Link existing selected documents from 180 Documents
      if (parsedDocIds.length > 0) {
        for (const docId of parsedDocIds) {
          await (prisma as any).vaultDocumentItem.create({
            data: {
              vaultId: vault.id,
              documentId: docId,
              status: 'ready'
            }
          }).catch(() => {});
        }
      }

      // 3. Process any uploaded files (PDF, DOCX, TXT, CSV, JSON, MD)
      const files: any[] = req.files || (req.file ? [req.file] : []);
      const MAX_VAULT_BYTES = 50 * 1024 * 1024; // 50MB limit
      const incomingFilesSize = files.reduce((acc: number, f: any) => acc + (f.size || (f.buffer ? f.buffer.length : 0)), 0);
      if (incomingFilesSize > MAX_VAULT_BYTES) {
        return res.status(400).json({ error: 'Total uploaded file size exceeds the 50MB limit per vault.' });
      }
      const chunker = new DocumentChunker({ maxWordsPerChunk: 350, overlapWords: 60 });
      const embeddingEngine = new EmbeddingEngine();
      let totalGeneratedChunks = 0;
      let totalSizeBytes = 0;

      // Also generate chunks from Purpose Anchor & Structured Business Fields
      const syntheticChunks: Array<{ text: string; title: string }> = [];

      if (purposeDescription && purposeDescription.trim()) {
        syntheticChunks.push({
          title: `Vault Purpose & Mission Directive: ${vault.name}`,
          text: `VAULT CONTEXT & OPERATIONAL PURPOSE (${vault.name}):\n${purposeDescription.trim()}`
        });
      }

      if (mode === 'business_driven') {
        if (parsedOfferings && parsedOfferings.length > 0) {
          const catalogLines = parsedOfferings.map((o: any) => 
            `- ${o.name}: Starting at $${o.startingPrice || 0} (${o.description || 'Standard offering'}) [Available: ${o.inStock !== false ? 'Yes' : 'No'}]`
          ).join('\n');
          syntheticChunks.push({
            title: `Official Offerings & Pricing Catalog: ${vault.name}`,
            text: `OFFICIAL PRODUCTS, SERVICES & LIVE PRICING CATALOG:\n${catalogLines}`
          });
        }

        if (parsedCustomers && parsedCustomers.length > 0) {
          const customerLines = parsedCustomers.map((c: any) => 
            `• Client: ${c.name} | Phone: ${c.phone} | Status: ${c.status || 'Active'} | Notes: ${c.lastOutcome || 'None'}`
          ).join('\n');
          syntheticChunks.push({
            title: `Verified CRM Clients & Customer Directory: ${vault.name}`,
            text: `CUSTOMER DIRECTORY & VERIFIED CLIENT RECORDS:\n${customerLines}`
          });
        }
      }

      // Vectorize Synthetic Structured Chunks
      if (syntheticChunks.length > 0) {
        for (let i = 0; i < syntheticChunks.length; i++) {
          const sChunk = syntheticChunks[i];
          const chunks = chunker.chunkText(sChunk.text, sChunk.title, {
            vaultId: vault.id,
            category: vault.category,
            purposeAnchor: purposeDescription
          });

          for (const c of chunks) {
            const vec = await embeddingEngine.generateEmbedding(c.content);
            // Create a virtual doc holder if needed or attach to chunk
            await (prisma as any).knowledgeChunk.create({
              data: {
                companyId,
                documentId: vault.id, // linked directly to vault
                vaultId: vault.id,
                category: vault.category,
                chunkIndex: totalGeneratedChunks++,
                content: c.content,
                embedding: vec,
                metadata: {
                  ...c.metadata,
                  vaultId: vault.id,
                  vaultName: vault.name,
                  category: vault.category,
                  isSynthetic: true
                }
              }
            }).catch(() => {});
          }
        }
      }

      // Process uploaded file buffers
      for (const file of files) {
        const filename = file.originalname || 'uploaded-file.txt';
        const fileSizeBytes = file.size || (file.buffer ? file.buffer.length : 0);
        totalSizeBytes += fileSizeBytes;

        let text = '';
        const lowerName = filename.toLowerCase();

        try {
          if (lowerName.endsWith('.pdf')) {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(file.buffer);
            text = data.text || '';
          } else if (lowerName.endsWith('.docx')) {
            const mammoth = require('mammoth');
            const data = await mammoth.extractRawText({ buffer: file.buffer });
            text = data.value || '';
          } else {
            text = file.buffer.toString('utf-8');
          }
        } catch (err: any) {
          text = file.buffer ? file.buffer.toString('utf-8') : '';
        }

        if (text && text.trim()) {
          // Create CompanyKnowledgeDoc
          const kDoc = await (prisma as any).companyKnowledgeDoc.create({
            data: {
              companyId,
              filename,
              mimeType: file.mimetype || 'application/octet-stream',
              fileSizeBytes,
              status: 'ready',
              progressPercent: 100,
              totalChunks: 0
            }
          });

          const chunks = chunker.chunkText(text, filename, {
            vaultId: vault.id,
            category: vault.category,
            purposeAnchor: purposeDescription
          });

          const BATCH_SIZE = 5;
          for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
            const batch = chunks.slice(b, b + BATCH_SIZE);
            const vectors = await embeddingEngine.generateBatchEmbeddings(batch.map(c => c.content));

            for (let j = 0; j < batch.length; j++) {
              await (prisma as any).knowledgeChunk.create({
                data: {
                  companyId,
                  documentId: kDoc.id,
                  vaultId: vault.id,
                  category: vault.category,
                  chunkIndex: totalGeneratedChunks++,
                  content: batch[j].content,
                  embedding: vectors[j] || [],
                  metadata: {
                    ...batch[j].metadata,
                    vaultId: vault.id,
                    vaultName: vault.name,
                    category: vault.category
                  }
                }
              });
            }
          }

          await (prisma as any).companyKnowledgeDoc.update({
            where: { id: kDoc.id },
            data: { totalChunks: chunks.length }
          });
        }
      }

      // 4. Finalize Vault
      const updatedVault = await (prisma as any).ragMemoryVault.update({
        where: { id: vault.id },
        data: {
          totalDocuments: (parsedDocIds.length + files.length),
          totalChunks: totalGeneratedChunks,
          totalSizeBytes: BigInt(totalSizeBytes),
          status: 'ready',
          progressPercent: 100
        }
      });

      return res.json({
        success: true,
        message: `RAG Memory Vault "${vault.name}" created with ${totalGeneratedChunks} indexed chunks.`,
        vault: {
          ...updatedVault,
          totalSizeBytes: Number(updatedVault.totalSizeBytes)
        }
      });
    } catch (err: any) {
      console.error('[VaultsController.createVault] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * List all RAG Memory Vaults for a company
   */
  async listVaults(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId || req.query?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const vaults = await (prisma as any).ragMemoryVault.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              documents: true,
              linkedAgents: true
            }
          }
        }
      });

      return res.json({
        success: true,
        vaults: vaults.map((v: any) => ({
          id: v.id,
          name: v.name,
          purposeDescription: v.purposeDescription,
          mode: v.mode,
          category: v.category,
          visibility: v.visibility,
          totalDocuments: v.totalDocuments || v._count?.documents || 0,
          totalChunks: v.totalChunks || 0,
          totalSizeBytes: Number(v.totalSizeBytes || 0),
          status: v.status,
          progressPercent: v.progressPercent,
          linkedAgentsCount: v._count?.linkedAgents || 0,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Get Vault Details
   */
  async getVaultDetails(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const vault = await (prisma as any).ragMemoryVault.findUnique({
        where: { id },
        include: {
          documents: {
            include: { document: true }
          },
          linkedAgents: {
            include: { voiceAgent: { select: { id: true, name: true, role: true } } }
          }
        }
      });

      if (!vault || (companyId && vault.companyId !== companyId)) {
        return res.status(404).json({ error: 'Vault not found' });
      }

      return res.json({
        success: true,
        vault: {
          ...vault,
          totalSizeBytes: Number(vault.totalSizeBytes || 0)
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Delete RAG Memory Vault
   */
  async deleteVault(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      await (prisma as any).ragMemoryVault.deleteMany({
        where: { id, companyId }
      });

      // Cleanup chunks
      await (prisma as any).knowledgeChunk.deleteMany({
        where: { vaultId: id, companyId }
      }).catch(() => {});

      return res.json({ success: true, message: 'RAG Memory Vault deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Query a specific Vault using Hybrid Search
   */
  async queryVault(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const { query, topK = 4 } = req.body;

      if (!query || !query.trim()) return res.status(400).json({ error: 'Query is required' });

      const searchService = new HybridSearchService();
      const results = await searchService.search(companyId, query.trim(), Number(topK) || 4, {
        vaultId: id
      });

      return res.json({
        success: true,
        query,
        count: results.length,
        results
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * List Custom Dynamic Document Categories for a company
   */
  async listCategories(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId || req.query?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      let categories = await (prisma as any).documentCategory.findMany({
        where: { companyId },
        orderBy: { name: 'asc' }
      }).catch(() => []);

      // If company has no custom categories yet, initialize standard universal starter categories
      if (!categories || categories.length === 0) {
        const DEFAULT_CATEGORIES = [
          { name: 'General', color: '#6366f1', description: 'General company documents and notes' },
          { name: 'Contracts & Legal', color: '#ec4899', description: 'Client contracts, NDAs, and SLAs' },
          { name: 'Offerings & Catalogs', color: '#10b981', description: 'Product catalogs, service price lists' },
          { name: 'HR & Workforce', color: '#f59e0b', description: 'Employee handbooks, policies, and onboarding' },
          { name: 'Technical & Manuals', color: '#3b82f6', description: 'Hardware specs, API docs, SOPs' },
          { name: 'Customer FAQs', color: '#8b5cf6', description: 'Support guides, return policies, warranties' }
        ];

        for (const cat of DEFAULT_CATEGORIES) {
          await (prisma as any).documentCategory.create({
            data: { companyId, ...cat }
          }).catch(() => {});
        }

        categories = await (prisma as any).documentCategory.findMany({
          where: { companyId },
          orderBy: { name: 'asc' }
        }).catch(() => []);
      }

      return res.json({ success: true, categories });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Create a new Custom Dynamic Document Category
   */
  async createCategory(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { name, color = '#6366f1', description } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

      const category = await (prisma as any).documentCategory.create({
        data: {
          companyId,
          name: name.trim(),
          color,
          description: description ? description.trim() : null
        }
      });

      return res.json({ success: true, category });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Delete Custom Category
   */
  async deleteCategory(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      await (prisma as any).documentCategory.deleteMany({
        where: { id, companyId }
      });

      return res.json({ success: true, message: 'Category removed' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};
