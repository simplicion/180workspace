const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

process.env.PYTHONIOENCODING = 'utf-8';

async function runSsm(commands) {
  const tmpParamsFile = path.join(os.tmpdir(), `ssm_backend_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8' }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;

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
          console.log(Buffer.from(output).toString('utf-8'));
          console.log('------------------\n');
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          return output;
        } else if (status === 'Failed' || status === 'Cancelled' || status === 'TimedOut') {
          console.error(`SSM Failed (${status}):\nSTDOUT: ${output}\nSTDERR: ${errorOutput}`);
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          return null;
        }
      } catch (err) {}
    }
  } catch (err) {
    console.error('SSM invocation error:', err.message);
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

runSsm([
  'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
  'docker logs 180workspace-backend --tail 30'
]);
