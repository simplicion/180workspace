const express = require('express');
const app = express();
const workspaceToolsRoutes = express.Router();
const documentsRoutes = express.Router();
documentsRoutes.delete('/:id', (req, res) => res.json({ success: true }));
workspaceToolsRoutes.use('/documents', documentsRoutes);
const apiRoutes = express.Router();
apiRoutes.use('/v1/workspace-tools', workspaceToolsRoutes);
app.use('/api', apiRoutes);
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});
const request = require('http').request;
app.listen(4005, () => {
    const req = request('http://localhost:4005/api/v1/workspace-tools/documents/cec552a6-6610-4d7e-a2e9-c5623e93c190', { method: 'DELETE' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { console.log(data); process.exit(0); });
    });
    req.end();
});
