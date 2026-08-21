import fs from 'fs';
import path from 'path';

// A very lightweight local in-memory vector store for demonstration
// In a real enterprise system, this would use pgvector or Pinecone.
export class VectorStore {
    private storePath: string;
    private documents: any[];

    constructor() {
        this.storePath = path.join(__dirname, 'vector_store.json');
        this.documents = [];
        this.loadStore();
    }

    private loadStore() {
        if (fs.existsSync(this.storePath)) {
            try {
                this.documents = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
            } catch (err) {
                this.documents = [];
            }
        } else {
            this.documents = [];
        }
    }

    private saveStore() {
        fs.writeFileSync(this.storePath, JSON.stringify(this.documents, null, 2));
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set. Real embeddings require a valid API key.");
        }
        
        try {
            const { OpenAI } = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
            });
            return response.data[0].embedding;
        } catch (err) {
            console.error("OpenAI embedding failed:", err);
            throw new Error(`Failed to generate embeddings: ${err}`);
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async addDocument(id: string, text: string, metadata: any = {}) {
        const embedding = await this.generateEmbedding(text);
        
        // Chunk document if it's too large (simple chunking)
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunkEmbedding = await this.generateEmbedding(chunks[i]);
            this.documents.push({
                id: `${id}_chunk_${i}`,
                docId: id,
                text: chunks[i],
                embedding: chunkEmbedding,
                metadata
            });
        }
        this.saveStore();
    }

    async search(query: string, topK: number = 3, filter: ((meta: any) => boolean) | null = null) {
        const queryEmbedding = await this.generateEmbedding(query);
        
        const results = this.documents
            .filter(doc => filter ? filter(doc.metadata) : true)
            .map(doc => ({
                ...doc,
                score: this.cosineSimilarity(queryEmbedding, doc.embedding)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
            
        return results;
    }
}

export const vectorStore = new VectorStore();
