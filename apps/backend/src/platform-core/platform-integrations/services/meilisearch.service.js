'use strict';
const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_KEY || 'your_master_key_here',
});

// Configure Meilisearch Indices and Settings
exports.setupMeilisearch = async () => {
  try {
    const tasks = [];
    
    // Users Index
    tasks.push(client.index('users').updateSettings({
      searchableAttributes: ['name', 'companyName', 'role'],
      filterableAttributes: ['tenantId', 'role'],
      typoTolerance: { enabled: true }
    }));

    // Companies Index
    tasks.push(client.index('companies').updateSettings({
      searchableAttributes: ['name', 'metadata'],
      filterableAttributes: ['tenantId', 'industry'],
      typoTolerance: { enabled: true }
    }));

    // Projects Index
    tasks.push(client.index('projects').updateSettings({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['tenantId', 'status'],
      typoTolerance: { enabled: true }
    }));

    await Promise.all(tasks);
    console.log('Meilisearch indices configured successfully.');
  } catch (error) {
    console.error('Meilisearch setup failed:', error);
  }
};

// Sync functions
exports.syncUserToMeili = async (user) => {
  try {
    await client.index('users').addDocuments([{
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      companyName: user.companyName,
      role: user.role,
      photoUrl: user.photoUrl
    }]);
  } catch (error) {
    console.error('Meilisearch sync error (users):', error);
  }
};

exports.syncCompanyToMeili = async (company) => {
  try {
    await client.index('companies').addDocuments([{
      id: company.id,
      tenantId: company.tenantId,
      name: company.name,
      industry: company.metadata?.industry || null,
      metadata: JSON.stringify(company.metadata)
    }]);
  } catch (error) {
    console.error('Meilisearch sync error (companies):', error);
  }
};

exports.globalSearch = async (tenantId, query) => {
  try {
    // Search across indices in parallel
    const [userRes, companyRes, projectRes] = await Promise.all([
      client.index('users').search(query, { filter: `tenantId = ${tenantId}`, limit: 5 }),
      client.index('companies').search(query, { filter: `tenantId = ${tenantId}`, limit: 5 }),
      client.index('projects').search(query, { filter: `tenantId = ${tenantId}`, limit: 5 })
    ]);

    return {
      users: userRes.hits,
      companies: companyRes.hits,
      projects: projectRes.hits
    };
  } catch (error) {
    console.error('Meilisearch globalSearch error:', error);
    return { users: [], companies: [], projects: [] };
  }
};

module.exports.client = client;
