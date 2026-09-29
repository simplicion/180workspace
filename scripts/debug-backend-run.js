const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function runSsm(commands) {
  const tmpParamsFile = path.join(os.tmpdir(), `ssm_debug_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8', env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;

    let status = 'Pending';
    let output = '';

    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const checkRes = JSON.parse(execSync(checkCmd, { encoding: 'utf-8', env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } }));
        status = checkRes.Status;
        output = checkRes.StandardOutputContent || '';
        const errorOutput = checkRes.StandardErrorContent || '';

        if (status === 'Success') {
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
    return null;
  }
}

async function main() {
  const res = await runSsm([
    'cd /home/ubuntu/app',
    'export GITHUB_REPOSITORY_LOWER=simplicion/180workspace',
    'echo "=== RUNNING SERVER.JS MANUALLY ==="',
    'docker compose run --rm --no-deps -T backend npx tsx server.js 2>&1 | head -n 50 | tr -cd "\\11\\12\\15\\40-\\176"'
  ]);
  console.log(res);
}

main();
