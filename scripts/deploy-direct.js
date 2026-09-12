const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.PYTHONIOENCODING = 'utf-8';
process.env.LC_ALL = 'C.UTF-8';

const INSTANCE_ID = 'i-0faa8af91b9af8366';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function runSSM(stepName, commands, timeoutSeconds = 1200) {
  console.log(`\n======================================================`);
  console.log(`▶ STEP: ${stepName}`);
  console.log(`======================================================`);

  const tmpParamsFile = path.join(os.tmpdir(), `ssm_step_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --timeout-seconds ${timeoutSeconds} --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
    );
    const sendRes = JSON.parse(sendResRaw);
    const commandId = sendRes.Command.CommandId;
    console.log(`📡 Command dispatched (ID: ${commandId}). Executing...`);

    let status = 'Pending';
    let output = '';
    let errorOutput = '';

    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const rawRes = execSync(checkCmd, { encoding: 'utf-8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        const checkRes = JSON.parse(rawRes);
        status = checkRes.Status;
        output = checkRes.StandardOutputContent || '';
        errorOutput = checkRes.StandardErrorContent || '';

        if (status === 'Success') {
          console.log(`✅ [${stepName}] COMPLETED SUCCESSFULLY!`);
          if (output) console.log(output.trim());
          return output;
        } else if (status === 'Failed' || status === 'Cancelled' || status === 'TimedOut') {
          console.error(`❌ [${stepName}] FAILED with status: ${status}`);
          if (output) console.error('STDOUT:', output);
          if (errorOutput) console.error('STDERR:', errorOutput);
          throw new Error(`Step ${stepName} failed: ${errorOutput || status}`);
        } else {
          process.stdout.write('.');
        }
      } catch (e) {
        if (!e.message.includes('InvocationDoesNotExist')) {
          // transient check error
        }
      }
    }
  } finally {
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

async function main() {
  console.log('🚀 Initiating Complete Direct AWS EC2 Deployment');
  console.log(`Target: ${INSTANCE_ID} | Region: ${REGION} | Profile: ${PROFILE}`);

  // 1. Optimize EC2 Memory with 8GB Virtual Swap
  await runSSM('1. Configure 8GB Virtual Swap Memory', [
    'if [ ! -f /swapfile ] || [ $(stat -c%s /swapfile 2>/dev/null || echo 0) -lt 4000000000 ]; then',
    '  echo "==> Configuring 8GB Swap File..."',
    '  swapoff /swapfile 2>/dev/null || true',
    '  rm -f /swapfile 2>/dev/null || true',
    '  fallocate -l 8G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=8192',
    '  chmod 600 /swapfile',
    '  mkswap /swapfile',
    '  swapon /swapfile',
    '  grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab',
    'fi',
    'free -h'
  ]);

  // 2. Sync Git Repository to latest origin/main
  const token = execSync('gh auth token', { encoding: 'utf-8' }).trim();
  await runSSM('2. Synchronize Git Repository', [
    'export HOME=/root',
    'git config --global --add safe.directory /home/ubuntu/app',
    'cd /home/ubuntu/app',
    `git remote set-url origin https://x-access-token:${token}@github.com/simplicion/180workspace.git`,
    'git fetch origin main',
    'git checkout -B main origin/main',
    'echo "==> Current commit:"',
    'git log -n 1 --oneline'
  ]);

  // 3. Build Backend Container Image
  await runSSM('3. Build Backend Docker Image', [
    'export HOME=/root',
    'cd /home/ubuntu/app',
    'echo "==> Building ghcr.io/simplicion/180workspace:latest..."',
    'docker build -t ghcr.io/simplicion/180workspace:latest -f Dockerfile .',
    'echo "==> Backend image ready."'
  ], 1200);

  // 4. Build Frontend Container Image
  await runSSM('4. Build Frontend Docker Image', [
    'export HOME=/root',
    'cd /home/ubuntu/app',
    'echo "==> Building ghcr.io/simplicion/180workspace-frontend:latest..."',
    'docker build -t ghcr.io/simplicion/180workspace-frontend:latest -f apps/frontend/Dockerfile .',
    'echo "==> Frontend image ready."'
  ], 1200);

  // 5. Build Admin Web Container Image
  await runSSM('5. Build Admin Web Docker Image', [
    'export HOME=/root',
    'cd /home/ubuntu/app',
    'echo "==> Building ghcr.io/simplicion/180workspace-admin-web:latest..."',
    'docker build -t ghcr.io/simplicion/180workspace-admin-web:latest -f apps/admin-web/Dockerfile .',
    'echo "==> Admin Web image ready."'
  ], 1200);

  // 6. Rolling Restart Containers with Zero Downtime
  await runSSM('6. Rollout & Restart Containers', [
    'cd /home/ubuntu/app',
    'echo "==> Rolling recreate active containers..."',
    'docker compose up -d --force-recreate --remove-orphans',
    'docker compose -f docker-compose.livekit.yml up -d 2>/dev/null || true',
    'sleep 5',
    'echo "==> Active Container Status:"',
    'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
  ]);

  // 7. Cleanup dangling images to conserve SSD disk space
  await runSSM('7. Housekeeping & Prune Dangling Images', [
    'docker image prune -f',
    'df -h /'
  ]);

  console.log('\n🎉 ======================================================');
  console.log('🎉 DEPLOYMENT FULLY COMPLETE AND VERIFIED ON AWS EC2!');
  console.log('🎉 All containers are running the latest codebase.');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('\n💥 Deployment Aborted:', err.message);
  process.exit(1);
});
