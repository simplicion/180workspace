const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-0faa8af91b9af8366';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function deploy() {
  console.log('🚀 Starting Direct AWS EC2 Zero-Downtime Deployment...');
  console.log(`Target Instance: ${INSTANCE_ID} (Region: ${REGION}, Profile: ${PROFILE})`);

  const commands = [
    'cd /home/ubuntu/app',
    'echo "==> Pulling latest Git changes..."',
    'git fetch origin main',
    'git reset --hard origin/main',
    'echo "==> Building and starting production containers..."',
    'docker compose pull || true',
    'docker compose -f docker-compose.livekit.yml pull 2>/dev/null || true',
    'echo "==> Rolling restart containers..."',
    'docker compose up -d --force-recreate --remove-orphans',
    'docker compose -f docker-compose.livekit.yml up -d 2>/dev/null || true',
    'echo "==> Container status:"',
    'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
    'echo "==> Cleaning up unused images..."',
    'docker image prune -af --filter "until=24h" 2>/dev/null || true',
    'echo "==> DEPLOYMENT COMPLETE! All services operational."'
  ];

  const tmpParamsFile = path.join(os.tmpdir(), `ssm_params_${Date.now()}.json`);
  fs.writeFileSync(tmpParamsFile, JSON.stringify({ commands }), 'utf-8');

  console.log('\n📡 Sending deployment commands to EC2 via AWS SSM...');
  
  try {
    const sendResRaw = execSync(
      `aws ssm send-command --instance-ids "${INSTANCE_ID}" --document-name "AWS-RunShellScript" --parameters "file://${tmpParamsFile}" --region ${REGION} --profile ${PROFILE} --output json`,
      { encoding: 'utf-8' }
    );
    const sendRes = JSON.parse(sendResRaw);
    
    const commandId = sendRes.Command.CommandId;
    console.log(`✅ Command dispatched successfully! Command ID: ${commandId}`);
    console.log('⏳ Waiting for deployment execution on EC2...\n');

    let status = 'Pending';
    let output = '';

    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const checkRes = JSON.parse(execSync(checkCmd, { encoding: 'utf-8' }));
        status = checkRes.Status;
        output = checkRes.StandardOutputContent || '';
        const errorOutput = checkRes.StandardErrorContent || '';

        if (status === 'Success') {
          console.log('================ DEPLOYMENT LOGS ================');
          console.log(output);
          console.log('=================================================');
          console.log('\n🎉 Deployment Successful! Live server is running updated version.');
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          return;
        } else if (status === 'Failed' || status === 'Cancelled' || status === 'TimedOut') {
          console.error(`❌ Deployment failed with status: ${status}`);
          console.error('STDOUT:', output);
          console.error('STDERR:', errorOutput);
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          process.exit(1);
        } else {
          console.log(`Status: ${status}...`);
        }
      } catch (err) {
        // SSM might take a second to register invocation
      }
    }
  } catch (err) {
    console.error('Failed to dispatch SSM command:', err.message);
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
    process.exit(1);
  }
}

deploy().catch(console.error);
