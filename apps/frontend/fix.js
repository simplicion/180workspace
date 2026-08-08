const fs = require('fs');
const path = 'app/dashboard/(social-media-management-app)/content-calendar/[id]/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const newLines = [...lines.slice(0, 116), ...lines.slice(311)];
fs.writeFileSync(path, newLines.join('\n'));
console.log('Done!');
