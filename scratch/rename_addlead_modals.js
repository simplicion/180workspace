const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if(!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if(file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
        }
    });
    return results;
}

const oldModalPath1 = 'apps/frontend/app/dashboard/(crm-and-sales-app)/components/AddLeadModal.tsx';
const newModalPath1 = 'apps/frontend/app/dashboard/(crm-and-sales-app)/components/AddDealModal.tsx';

if (fs.existsSync(oldModalPath1)) {
    let content = fs.readFileSync(oldModalPath1, 'utf8');
    content = content.replace(/AddLeadModalProps/g, 'AddDealModalProps');
    content = content.replace(/AddLeadModal/g, 'AddDealModal');
    content = content.replace(/Lead created/g, 'Deal created');
    content = content.replace(/Lead updated/g, 'Deal updated');
    content = content.replace(/Edit Lead/g, 'Edit Deal');
    content = content.replace(/Add New Lead/g, 'Add New Deal');
    fs.writeFileSync(newModalPath1, content);
    fs.unlinkSync(oldModalPath1);
    console.log('Renamed AddLeadModal to AddDealModal 1');
}

const oldModalPath2 = 'apps/frontend/app/dashboard/(dashboard)/_components/AddLeadModal.tsx';
const newModalPath2 = 'apps/frontend/app/dashboard/(dashboard)/_components/AddDealModal.tsx';
if (fs.existsSync(oldModalPath2)) {
    let content = fs.readFileSync(oldModalPath2, 'utf8');
    content = content.replace(/AddLeadModalProps/g, 'AddDealModalProps');
    content = content.replace(/AddLeadModal/g, 'AddDealModal');
    content = content.replace(/Lead created/g, 'Deal created');
    content = content.replace(/Lead updated/g, 'Deal updated');
    content = content.replace(/Edit Lead/g, 'Edit Deal');
    content = content.replace(/Add New Lead/g, 'Add New Deal');
    fs.writeFileSync(newModalPath2, content);
    fs.unlinkSync(oldModalPath2);
    console.log('Renamed AddLeadModal to AddDealModal 2');
}

const files = walk('apps/frontend/app');
files.push('apps/frontend/components/shared/GlobalSearch.tsx');
files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;
        
        content = content.replace(/AddLeadModal/g, 'AddDealModal');
        
        if(content !== original) {
            fs.writeFileSync(file, content);
            console.log('Updated references in', file);
        }
    } catch(e) {}
});
