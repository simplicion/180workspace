const fs = require('fs'); 
const path = require('path'); 

function walk(dir) { 
    let results = []; 
    const list = fs.readdirSync(dir); 
    list.forEach(file => { 
        file = path.resolve(dir, file); 
        const stat = fs.statSync(file); 
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file)); 
        } else { 
            if (file.endsWith('.js') || file.endsWith('.ts')) results.push(file); 
        } 
    }); 
    return results; 
} 

const files = walk('apps/backend/src'); 
files.forEach(file => { 
    let content = fs.readFileSync(file, 'utf8'); 
    let original = content; 
    
    // Replace requires for email.service
    content = content.replace(/require\(['"].*communications-app\/emails\/email\.service(?:\.js)?['"]\)/g, 'require(\'@workspace/communications\')');
    
    if (file.includes('email.controller.js') || file.includes('queue.service.js')) {
        content = content.replace(/require\(['"]\.\/email\.service(?:\.js)?['"]\)/g, 'require(\'@workspace/communications\')');
    }

    if (content !== original) { 
        fs.writeFileSync(file, content, 'utf8'); 
        console.log('Updated ' + file); 
    } 
});
