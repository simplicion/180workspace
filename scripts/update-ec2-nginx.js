const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';
const PROFILE = 'simplicion';

async function updateNginx() {
  console.log('Reading local nginx/nginx.conf...');
  const localNginxConf = fs.readFileSync(path.join(__dirname, '../nginx/nginx.conf'), 'utf-8');
  const b64Conf = Buffer.from(localNginxConf, 'utf-8').toString('base64');

  const commands = [
    'echo "==> Backing up current nginx.conf..."',
    'cp /home/ubuntu/app/nginx/nginx.conf /home/ubuntu/app/nginx/nginx.conf.bak || true',
    `echo "${b64Conf}" | base64 -d > /home/ubuntu/app/nginx/nginx.conf`,
    'echo "==> Testing nginx configuration..."',
    'docker exec 180workspace-proxy nginx -t 2>&1',
    'echo "==> Reloading nginx reverse proxy..."',
    'docker exec 180workspace-proxy nginx -s reload 2>&1',
    'echo "==> SUCCESS! Nginx reloaded with 180identity.180workspace.com support."'
  ];

  const tmpParamsFile = path.join(os.tmpdir(), `ssm_nginx_${Date.now()}.json`);
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
    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const checkCmd = `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} --output json`;
        const checkRes = JSON.parse(execSync(checkCmd, { encoding: 'utf-8' }));
        status = checkRes.Status;
        const output = checkRes.StandardOutputContent || '';
        const errorOutput = checkRes.StandardErrorContent || '';

        if (status === 'Success') {
          console.log('\n--- NGINX DEPLOYMENT OUTPUT ---');
          console.log(output);
          console.log('-------------------------------\n');
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          return;
        } else if (status === 'Failed' || status === 'Cancelled' || status === 'TimedOut') {
          console.error(`SSM Failed (${status}):\nSTDOUT: ${output}\nSTDERR: ${errorOutput}`);
          try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
          process.exit(1);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error('Failed:', err.message);
    try { fs.unlinkSync(tmpParamsFile); } catch (_) {}
  }
}

updateNginx();
