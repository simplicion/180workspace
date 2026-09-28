const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function runSsm(commands) {
  const tmpParamsFile = path.join(os.tmpdir(), `ssm_inspect_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8' }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;
    console.log(`Dispatched SSM Command: ${commandId}`);

    let status = 'Pending';
    let output = '';

    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const checkRes = JSON.parse(execSync(checkCmd, { encoding: 'utf-8' }));
        status = checkRes.Status;
        output = checkRes.StandardOutputContent || '';
        const errorOutput = checkRes.StandardErrorContent || '';

        if (status === 'Success') {
          console.log('\n--- SSM OUTPUT ---');
          console.log(output);
          console.log('------------------\n');
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          return output;
        } else if (status === 'Failed' || status === 'Cancelled' || status === 'TimedOut') {
          console.error(`SSM Failed (${status}):\nSTDOUT: ${output}\nSTDERR: ${errorOutput}`);
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          return null;
        }
      } catch (err) {
        // SSM might take a moment to register
      }
    }
  } catch (err) {
    console.error('SSM invocation error:', err.message);
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

runSsm([
  'curl -I -s -H "Host: 180identity.180workspace.com" http://localhost:80/.well-known/openid-configuration | head -n 10',
  'curl -s -H "Host: 180identity.180workspace.com" http://localhost:80/.well-known/openid-configuration | head -c 200',
  'echo ""',
  'curl -I -s -H "Host: 180identity.180workspace.com" http://localhost:80/oauth/authorize?client_id=180-workspace-platform | head -n 10'
]);
