const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-0faa8af91b9af8366';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function check() {
  const commands = [
    'cd /home/ubuntu/app',
    'pwd',
    'git status || true',
    'git remote -v || true',
    'ls -la'
  ];

  const tmpParamsFile = path.join(os.tmpdir(), `ssm_check_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8' }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;

    let status = 'Pending';
    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const checkRes = JSON.parse(execSync(checkCmd, { encoding: 'utf-8' }));
        status = checkRes.Status;
        if (status === 'Success') {
          console.log(checkRes.StandardOutputContent);
          return;
        } else if (['Failed', 'Cancelled', 'TimedOut'].includes(status)) {
          console.error('Check failed:', checkRes.StandardErrorContent || status);
          return;
        }
      } catch (_) {}
    }
  } finally {
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

check().catch(console.error);
