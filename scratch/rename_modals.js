const fs = require('fs');
const path = require('path');

const oldModalPath = 'apps/frontend/app/dashboard/(crm-and-sales-app)/components/OpportunityModal.tsx';
const newModalPath = 'apps/frontend/app/dashboard/(crm-and-sales-app)/components/LeadPipelineModal.tsx';

if (fs.existsSync(oldModalPath)) {
    let content = fs.readFileSync(oldModalPath, 'utf8');
    content = content.replace(/OpportunityModalProps/g, 'LeadPipelineModalProps');
    content = content.replace(/OpportunityModal/g, 'LeadPipelineModal');
    content = content.replace(/editingOpportunity/g, 'editingLeadPipeline');
    content = content.replace(/Edit Opportunity/g, 'Edit Lead Pipeline');
    content = content.replace(/New Sales Opportunity/g, 'New Lead Pipeline');
    content = content.replace(/Opportunity updated/g, 'Lead Pipeline updated');
    content = content.replace(/Opportunity created/g, 'Lead Pipeline created');
    content = content.replace(/opportunity/gi, 'lead pipeline');
    fs.writeFileSync(newModalPath, content);
    fs.unlinkSync(oldModalPath);
    console.log('Renamed and updated OpportunityModal to LeadPipelineModal');
}

const pipelinePagePath = 'apps/frontend/app/dashboard/(crm-and-sales-app)/sales/leads-pipeline/page.tsx';
if (fs.existsSync(pipelinePagePath)) {
    let content = fs.readFileSync(pipelinePagePath, 'utf8');
    content = content.replace(/OpportunityModal/g, 'LeadPipelineModal');
    content = content.replace(/editingOpportunity/g, 'editingLeadPipeline');
    content = content.replace(/opportunity/gi, 'leadPipeline');
    content = content.replace(/opportunities/gi, 'leadPipelines');
    content = content.replace(/Opportunity/g, 'LeadPipeline');
    fs.writeFileSync(pipelinePagePath, content);
    console.log('Updated leads-pipeline page.tsx');
}
