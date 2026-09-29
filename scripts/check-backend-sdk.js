const { SSMClient, SendCommandCommand, GetCommandInvocationCommand } = require('@aws-sdk/client-ssm');
const { fromIni } = require('@aws-sdk/credential-providers');

const INSTANCE_ID = 'i-040592f78ef3ea179';
const REGION = 'us-east-1';

const ssm = new SSMClient({
  region: REGION,
  credentials: fromIni({ profile: 'simplicion' })
});

async function runCommands(commands) {
  try {
    const send = await ssm.send(new SendCommandCommand({
      InstanceIds: [INSTANCE_ID],
      DocumentName: 'AWS-RunShellScript',
      Parameters: { commands }
    }));
    const commandId = send.Command.CommandId;
    console.log(`Dispatched SSM Command: ${commandId}`);

    let status = 'Pending';
    while (status === 'Pending' || status === 'InProgress' || status === 'Delayed') {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const get = await ssm.send(new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: INSTANCE_ID
        }));
        status = get.Status;
        if (status === 'Success') {
          console.log('\n--- SSM OUTPUT ---');
          console.log(get.StandardOutputContent);
          console.log('------------------\n');
          return get.StandardOutputContent;
        } else if (status === 'Failed' || status === 'Cancelled' || status === 'TimedOut') {
          console.error(`SSM Failed (${status}):\nSTDOUT: ${get.StandardOutputContent}\nSTDERR: ${get.StandardErrorContent}`);
          return null;
        }
      } catch (err) {
        // SSM might take a moment to register
      }
    }
  } catch (err) {
    console.error('SSM error:', err.message);
  }
}

runCommands([
  'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
  'docker logs 180workspace-backend --tail 50'
]);
