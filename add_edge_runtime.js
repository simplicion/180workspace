const fs = require('fs');
const glob = require('glob');
const files = glob.sync('c:/Users/saavi/OneDrive/Desktop/180workspace/apps/frontend/app/api/**/route.ts');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.includes("export const runtime = 'edge'")) {
    fs.appendFileSync(f, "\nexport const runtime = 'edge';\n");
    console.log('Updated ' + f);
  }
});
