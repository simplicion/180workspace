const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/saavi/OneDrive/Desktop/180workspace/apps/frontend/app/dashboard/(productivity-tools-app)';
const files = [
    'components/AIEmailDraftModal.tsx',
    'components/ContentPieceModal.tsx',
    '_components/TemplatesListModal.tsx',
    '_components/EventDetailsModal.tsx',
    '_components/DocumentAIChatModal.tsx'
];

for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) continue;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add Drawer import if not present
    if (!content.includes('import Drawer')) {
        content = "import Drawer from '@/components/ui/Drawer';\n" + content;
    }
    
    // Replace "Modal" with "Drawer" in function names and export names
    const newFile = file.replace('Modal', 'Drawer');
    content = content.replace(/Modal/g, 'Drawer');
    
    // Update the wrapper to use Drawer instead of fixed inset-0
    // Generally the modal wrapper starts with <div className="fixed inset-0...
    content = content.replace(/<div className="fixed inset-0 z-\[\d+\].*?>\s*<div.*?>/s, '<Drawer open={true} onClose={onClose} title="Details">');
    // We also need to remove the closing tags. This is tricky with regex.
    
    fs.writeFileSync(path.join(dir, newFile), content);
    console.log('Created ' + newFile);
}
