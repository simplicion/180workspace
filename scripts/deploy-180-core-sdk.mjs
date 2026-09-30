import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const srcJs = path.join(rootDir, 'packages', 'identity-sdk', 'src', '180-core-sdk.js');
const srcMinJs = path.join(rootDir, 'packages', 'identity-sdk', 'src', '180-core-sdk.min.js');
const srcDts = path.join(rootDir, 'packages', 'identity-sdk', 'src', '180-core-sdk.d.ts');

if (!fs.existsSync(srcJs) || !fs.existsSync(srcMinJs)) {
  console.error('Source files missing in packages/identity-sdk/src');
  process.exit(1);
}

const targetDirs = [
  path.join(rootDir, 'apps', 'frontend', 'public', 'sdk'),
  path.join(rootDir, 'apps', 'frontend', 'public', 'sdk', 'v1'),
  path.join(rootDir, 'apps', '180developers-frontend', 'public', 'sdk'),
  path.join(rootDir, 'apps', '180developers-frontend', 'public', 'sdk', 'v1'),
  path.join(rootDir, 'apps', '180-profile-frontend', 'public', 'sdk'),
  path.join(rootDir, 'apps', '180-profile-frontend', 'public', 'sdk', 'v1'),
];

console.log('--- DEPLOYING 180 CORE SDK TO GLOBAL CDN REPOSITORIES ---');

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }

  const destJs = path.join(dir, '180-core-sdk.js');
  const destMinJs = path.join(dir, '180-core-sdk.min.js');
  const destDts = path.join(dir, '180-core-sdk.d.ts');

  fs.copyFileSync(srcJs, destJs);
  fs.copyFileSync(srcMinJs, destMinJs);
  fs.copyFileSync(srcDts, destDts);

  console.log(`Deployed to: ${dir}`);
  console.log(`  180-core-sdk.js     (${fs.statSync(destJs).size} bytes)`);
  console.log(`  180-core-sdk.min.js (${fs.statSync(destMinJs).size} bytes)`);
}

console.log('--- CDN DEPLOYMENT COMPLETE ---');
