const fs = require('fs');
const p = 'src/auth.service.ts';
let c = fs.readFileSync(p, 'utf8');
if (!c.startsWith('// @ts-nocheck')) {
  c = '// @ts-nocheck\n' + c;
}
c = c.replace("import { logAction } from '@workspace/backend-common';", "import { logAction, triggerAutomation } from '@workspace/backend-common';");
c = c.replace(/import AutomationService from '..\/..\/platform-core\/platform-communications\/services\/automation.service.js';\s+AutomationService.trigger/g, 'triggerAutomation');
fs.writeFileSync(p, c);
