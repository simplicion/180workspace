const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-0faa8af91b9af8366';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function buildBackend() {
  console.log('🚀 Starting Backend Image Build on EC2...');

  const commands = [
    'export HOME=/root',
    'cd /home/ubuntu/app',
    'echo "==> Building Backend Docker Image..."',
    'docker build -t ghcr.io/simplicion/180workspace:latest -f Dockerfile .',
    'echo "==> Backend image built successfully!"',
    'docker images ghcr.io/simplicion/180workspace:latest'
  ];

  const tmpParamsFile = path.join(os.tmpdir(), `ssm_build_backend_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8' }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;
    console.log(`Dispatched backend build: ${commandId}`);

    let status = 'Pending';
    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const checkRes = JSON.parse(execSync(checkCmd, { encoding: 'utf-8' }));
        status = checkRes.Status;
        if (status === 'Success') {
          console.log('\n--- BACKEND BUILD SUCCESS ---');
          console.log(checkRes.StandardOutputContent);
          return;
        } else if (['Failed', 'Cancelled', 'TimedOut'].includes(status)) {
          console.error('Backend build failed:', checkRes.StandardErrorContent || status);
          console.log('STDOUT:', checkRes.StandardOutputContent);
          return;
        } else {
          console.log(`Building backend... (Status: ${status})`);
        }
      } catch (_) {}
    }
  } finally {
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

buildBackend().catch(console.error);
