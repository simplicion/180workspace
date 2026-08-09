const { basePrisma, getCompanyPrisma } = require('@workspace/db');
const SalesService = require('./src/app-registry/crm-and-sales-app/sales/sales.service.js');

async function test() {
    try {
        const company = await basePrisma.company.findFirst();
        if (!company) return console.log('No company found');
        const user = await basePrisma.user.findFirst({ where: { companyId: company.id } });
        
        const companyPrisma = getCompanyPrisma(company.id);
        
        console.log('Testing getDashboardMetrics...');
        const res = await SalesService.getDashboardMetrics(companyPrisma, user.id, company.id, 'month');
        console.log('Success!', res != null);
    } catch(e) {
        console.error('Error:', e);
    }
}
test().then(() => process.exit(0));
