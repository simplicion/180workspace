const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function runSsm(commands) {
  const tmpParamsFile = path.join(os.tmpdir(), `ssm_audit_${Date.now()}.json`);
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
  console.log('=== AUDITING EC2 SERVER ENVIRONMENT (180workspace-backend) ===');
  const res = await runSsm([
    'echo "=== DOCKER CONTAINERS ==="',
    'docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"',
    'echo ""',
    'echo "=== DISK USAGE ==="',
    'df -h /',
    'echo ""',
    'echo "=== MEMORY USAGE ==="',
    'free -m',
    'echo ""',
    'echo "=== NGINX SITES ENABLED ==="',
    'ls -la /etc/nginx/sites-enabled/ 2>/dev/null || ls -la /home/ubuntu/app/nginx 2>/dev/null || true',
    'echo ""',
    'echo "=== RUNNING PROCESSES (NON-DOCKER) ==="',
    'ps aux | grep -E "node|redis|livekit|pm2" | grep -v grep || true',
    'echo ""',
    'echo "=== ENV VARIABLE KEYS CONFIGURED ON HOST ==="',
    'cat /home/ubuntu/app/.env 2>/dev/null | grep -v "^#" | grep -v "^$" | cut -d= -f1 || echo "No .env found in /home/ubuntu/app"'
  ]);

  console.log(res);
}

main();
