const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-0faa8af91b9af8366';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function testGit() {
  const token = execSync('gh auth token', { encoding: 'utf-8' }).trim();
  const commands = [
    'export HOME=/root',
    'git config --global --add safe.directory /home/ubuntu/app',
    'cd /home/ubuntu/app',
    `git remote set-url origin https://x-access-token:${token}@github.com/simplicion/180workspace.git`,
    'git fetch origin main',
    'git checkout -B main origin/main',
    'echo "=== LATEST COMMIT ON EC2 ==="',
    'git log -n 3 --oneline'
  ];

  const tmpParamsFile = path.join(os.tmpdir(), `ssm_git_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8' }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;
    console.log(`Dispatched git test: ${commandId}`);

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
          console.error('Git test failed:', checkRes.StandardErrorContent || status);
          return;
        }
      } catch (_) {}
    }
  } finally {
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

testGit().catch(console.error);
