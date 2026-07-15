const { Meilisearch } = require('meilisearch');

const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey'
});

class SearchService {
    static async initIndices() {
        try {
            await meiliClient.index('companies').updateSettings({ searchableAttributes: ['companyName', 'subdomain', 'industry'] });
            await meiliClient.index('users').updateSettings({ searchableAttributes: ['name', 'email', 'role'] });
            await meiliClient.index('leads').updateSettings({ searchableAttributes: ['firstName', 'lastName', 'email', 'company', 'industry'] });
            console.log('[SearchService] Meilisearch indices initialized.');
        } catch (err) {
            console.error('[SearchService] Meilisearch not available:', err.message);
        }
    }

    static async syncDocument(indexName, document) {
        try {
            // Meilisearch requires primary key 'id'
            const doc = { ...document, id: document.id || document._id.toString() };
            delete doc._id;
            await meiliClient.index(indexName).addDocuments([doc]);
        } catch (err) {
            console.error('[SearchService] Failed to sync document:', err.message);
        }
    }

    static async removeDocument(indexName, documentId) {
        try {
            await meiliClient.index(indexName).deleteDocument(documentId);
        } catch (err) {
            console.error('[SearchService] Failed to remove document:', err.message);
        }
    }

    static async globalSearch(query) {
        try {
            const [companies, users, leads] = await Promise.all([
                meiliClient.index('companies').search(query, { limit: 5 }),
                meiliClient.index('users').search(query, { limit: 5 }),
                meiliClient.index('leads').search(query, { limit: 5 })
            ]);
            return {
                companies: companies.hits,
                users: users.hits,
                leads: leads.hits
            };
        } catch (err) {
            console.error('[SearchService] Search failed:', err.message);
            return { companies: [], users: [], leads: [] };
        }
    }
}

SearchService.initIndices();

module.exports = SearchService;
