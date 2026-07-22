const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'saavi', 'OneDrive', 'Desktop', '180workspace', 'apps', 'backend', 'src', 'app-registry', 'crm-and-sales-app', 'sales', 'sales.controller.js');
let content = fs.readFileSync(file, 'utf8');

const mutations = [
    'createLead', 'updateLead', 'deleteLead', 'convertLead',
    'createOpportunity', 'updateOpportunity', 'deleteOpportunity', 'createProjectFromOpportunity',
    'createAccount', 'updateAccount', 'deleteAccount',
    'createContact', 'updateContact', 'deleteContact',
    'createActivity',
    'createQuote', 'updateQuote', 'deleteQuote'
];

mutations.forEach(method => {
    // We want to find exports.<method> = async (req, res, next) => {
    // and then the first es.status(something).json( or es.json( inside it.
    
    const regex = new RegExp(\(exports\\\\.\\\\\s*=\\\\s*async\\\\s*\\\\([^\\\\)]+\\\\)\\\\s*=>\\\\s*\\\\{[\\\\s\\\\S]*?)(res\\\\.json\\\\(|res\\\\.status\\\\(\\\\d+\\\\)\\\\.json\\\\()\, 'g');
    content = content.replace(regex, (match, prefix, resCall) => {
        return prefix + 'if (req.company && req.company.id) await clearCRMCache(req.company.id);\\n        ' + resCall;
    });
});

fs.writeFileSync(file, content, 'utf8');
console.log('sales.controller.js patched');
