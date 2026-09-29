const { SSMClient, SendCommandCommand, GetCommandInvocationCommand } = require('@aws-sdk/client-ssm');
const { fromIni } = require('@aws-sdk/credential-providers');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';

const ssm = new SSMClient({
  region: REGION,
  credentials: fromIni({ profile: 'simplicion' })
});

async function main() {
  // Send command
  const sendRes = await ssm.send(new SendCommandCommand({
    DocumentName: 'AWS-RunShellScript',
    InstanceIds: [INSTANCE_ID],
    Parameters: {
      commands: [
        'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
        'echo "===BACKEND LOGS==="',
        'docker logs 180workspace-backend --tail 50 2>&1',
      ]
    }
  }));

  const commandId = sendRes.Command.CommandId;
  console.log('Command ID:', commandId);

  // Wait for result
  await new Promise(r => setTimeout(r, 4000));

  const result = await ssm.send(new GetCommandInvocationCommand({
    CommandId: commandId,
    InstanceId: INSTANCE_ID
  }));

  console.log('Status:', result.Status);
  console.log('\n=== STDOUT ===');
  console.log(result.StandardOutputContent);
  if (result.StandardErrorContent) {
    console.log('\n=== STDERR ===');
    console.log(result.StandardErrorContent);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
