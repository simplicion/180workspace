const fs = require('fs');
const slugPage = 'app/f/[slug]/page.tsx';
if (fs.existsSync(slugPage)) {
    let content = fs.readFileSync(slugPage, 'utf8');
    content = content.replace(/params\.slug/g, 'slug');
    fs.writeFileSync(slugPage, content);
}

const contractPage = 'app/f/contract/[token]/page.tsx';
if (fs.existsSync(contractPage)) {
    let content = fs.readFileSync(contractPage, 'utf8');
    content = content.replace(/type:\s*'jpeg'/g, "type: 'jpeg' as const");
    fs.writeFileSync(contractPage, content);
}
console.log('Fixed typescript minor errors');
