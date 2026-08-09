const fs = require('fs');
const path = require('path');
const { basePrisma } = require('../index.js');

async function main() {
    const filePath = path.join(__dirname, '../../../../apps/frontend/app/dashboard/(company-hub-app)/components/templatesData.ts');
    const contentText = fs.readFileSync(filePath, 'utf-8');

    const firstCompany = await basePrisma.company.findFirst();
    if (!firstCompany) {
        throw new Error("No company found in database to seed templates for.");
    }
    
    const firstUser = await basePrisma.user.findFirst();
    if (!firstUser) {
        throw new Error("No user found in database to seed templates for.");
    }

    const regex = /id:\s*'([^']+)',\s*category:\s*'([^']+)',\s*title:\s*'([^']+)',\s*description:\s*'([^']+)',\s*generate:\s*\([^)]*\)\s*=>\s*brandedPage\([^,]+,\s*`([\s\S]*?)`,\s*b\)/g;

    let match;
    let count = 0;
    while ((match = regex.exec(contentText)) !== null) {
        const [_, id, category, title, description, bodyRaw] = match;
        
        console.log(`Migrating template: ${title} (${category})`);

        let body = bodyRaw
            .replace(/\[Candidate Full Name\]/g, '{{employeeName}}')
            .replace(/\[Candidate Name\]/g, '{{employeeName}}')
            .replace(/\[Job Title\]/g, '{{employeeDesignation}}')
            .replace(/\[Annual Salary\]/g, '{{employeeSalary}}')
            .replace(/\[Base Salary Per Annum\]/g, '{{employeeSalary}}')
            .replace(/\[Client Name\]/g, '{{clientName}}')
            .replace(/\[Client Email\]/g, '{{clientEmail}}')
            .replace(/\[Company Name\]/g, '{{projectName}}') 
            .replace(/class="field"/g, 'style="color: #2563eb; font-weight: 500; background: #eff6ff; padding: 2px 4px; border-radius: 4px;"');

        const blocks = [
            {
                id: `block-${id}-1`,
                type: 'text',
                content: { text: body },
                styles: {}
            }
        ];

        const documentDetails = {
            title: title,
            documentType: category === 'offer_letter' ? 'hr' : category === 'contract' ? 'contract' : 'general',
            description: description
        };

        const articleData = {
            title: title,
            category: 'Template',
            content: JSON.stringify({
                blocks,
                documentDetails,
                isCustom: false,
                legacyId: id
            }),
            company: { connect: { id: firstCompany.id } },
            createdBy: { connect: { id: firstUser.id } }
        };

        await basePrisma.knowledgeArticle.create({
            data: articleData
        });

        count++;
    }

    console.log(`Successfully migrated ${count} templates!`);
}

main().catch(console.error).finally(() => basePrisma.$disconnect());
