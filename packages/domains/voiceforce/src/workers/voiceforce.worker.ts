import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@workspace/db';
import { VoiceforcePromptService } from '../prompts/voiceforce-prompts';
import { LiveKitRoomWorker } from '../engines/livekit-room.worker';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export function setupVoiceforceWorker(customRedis?: Redis | any) {
  const redis = customRedis || new Redis(redisUrl, { maxRetriesPerRequest: null });
  if (!redis) return null;

  const promptService = new VoiceforcePromptService();

  // Register repeatable daily phone renewal and 5-day grace period audit job (midnight UTC)
  try {
    const voiceQueue = new Queue('voiceforce-queue', { connection: redis });
    voiceQueue.add(
      'voiceforce-daily-audit',
      {},
      {
        repeat: { pattern: '0 0 * * *' },
        jobId: 'voiceforce-daily-audit-repeatable',
        removeOnComplete: true
      }
    ).catch(err => console.warn('[VoiceforceWorker] Daily audit cron registration note:', err.message));
  } catch (err: any) {
    console.warn('[VoiceforceWorker] Could not initialize repeatable queue:', err.message);
  }

  const worker = new Worker(
    'voiceforce-queue',
    async (job) => {
      const jobType = job.name || job.data?.type || (job as any).type;
      const data = job.data || {};
      console.log(`[VoiceforceWorker] Processing job ${job.id}: ${jobType}`);

      switch (jobType) {
        case 'dispatch-call': {
          const { callSessionId, companyId, maxConcurrent } = data;

          // 1. Check Company Active Call Concurrency
          const activeKey = `voiceforce:active:${companyId}`;
          const currentCount = await redis.incr(activeKey);

          if (currentCount > (maxConcurrent || 5)) {
            await redis.decr(activeKey);
            throw new Error('CONCURRENCY_LIMIT_REACHED');
          }

          try {
            const session = await (prisma as any).callSession.findUnique({
              where: { id: callSessionId },
              include: { phoneNumber: true }
            });

            if (!session) {
              await redis.decr(activeKey);
              return;
            }

            const roomName = `call_${callSessionId}`;

            // Set state to dialing / initiating
            await (prisma as any).callSession.update({
              where: { id: callSessionId },
              data: {
                status: 'dialing',
                livekitRoomName: roomName,
                startedAt: new Date()
              }
            });

            // 2. Spin up LiveKitRoomWorker to initiate carrier dial
            const roomWorker = new LiveKitRoomWorker({
              callSessionId,
              roomName,
              companyId,
              voiceAgentId: session.voiceAgentId,
              recipientPhone: session.recipientPhone,
              callerIdNumber: session.phoneNumber?.e164Number || session.structuredData?.callerIdNumber || (session as any).callerIdNumber || null,
              sipTrunkId: process.env.LIVEKIT_SIP_TRUNK_ID || 'ST_FFXV3xAMx44y',
              isOutbound: session.direction === 'outbound'
            });

            await roomWorker.start();
            console.log(`[VoiceforceWorker] Call ${callSessionId} dispatched into room ${roomName}`);
          } catch (err: any) {
            await redis.decr(activeKey);
            console.error(`[VoiceforceWorker] Call ${callSessionId} dispatch failure:`, err.message);
            await (prisma as any).callSession.update({
              where: { id: callSessionId },
              data: {
                status: 'failed',
                disconnectReason: err.message,
                endedAt: new Date()
              }
            }).catch(() => {});
            throw err;
          }
          break;
        }

        case 'process-post-call': {
          const { callSessionId, companyId } = data;

          const session = await (prisma as any).callSession.findUnique({
            where: { id: callSessionId },
            include: { transcripts: { orderBy: { startTimeMs: 'asc' } } }
          });

          if (!session) break;

          // Release active concurrency slot
          const activeKey = `voiceforce:active:${companyId}`;
          await redis.decr(activeKey).catch(() => {});

          // Extract Post-Call Summary & Actions if transcripts exist
          let analysis: any = {
            summary: session.summary || 'Call finished.',
            sentiment: session.sentiment || 'Neutral',
            callOutcome: session.callOutcome || 'Inquiry Resolved',
            actionItems: []
          };

          if (session.transcripts && session.transcripts.length > 0) {
            try {
              analysis = await promptService.analyzeTranscript(session.transcripts);
            } catch (aErr: any) {
              console.warn('[VoiceforceWorker] Post-call analysis fallback:', aErr.message);
            }
          }

          const currentStructured = (session.structuredData && typeof session.structuredData === 'object')
            ? session.structuredData
            : {};

          const updatedStructured = {
            ...currentStructured,
            leadScore: analysis.leadScore || currentStructured.leadScore,
            customerObjections: analysis.customerObjections || currentStructured.customerObjections,
            orderInfo: analysis.orderInfo || currentStructured.orderInfo,
            appointmentInfo: analysis.appointmentInfo || currentStructured.appointmentInfo,
            processedAt: new Date().toISOString()
          };

          await (prisma as any).callSession.update({
            where: { id: callSessionId },
            data: {
              summary: analysis.summary || session.summary,
              sentiment: analysis.sentiment || session.sentiment,
              callOutcome: analysis.callOutcome || session.callOutcome,
              actionItems: analysis.actionItems || [],
              structuredData: updatedStructured,
              status: session.status === 'failed' ? 'failed' : 'completed'
            }
          });

          // Auto-create Follow-up Tasks in 180workspace
          if (analysis.actionItems && analysis.actionItems.length > 0) {
            for (const item of analysis.actionItems) {
              await (prisma as any).task.create({
                data: {
                  title: `[Call Action]: ${item}`,
                  description: `Automatically created from call with ${session.recipientPhone}. Summary: ${analysis.summary}`,
                  companyId,
                  priority: 'high',
                  status: 'todo'
                }
              }).catch((e: any) => console.error('[VoiceforceWorker] Error auto-creating task:', e.message));
            }
          }
          break;
        }

        case 'renew-number-rentals':
        case 'voiceforce-daily-audit': {
          console.log('[VoiceforceWorker] Running daily phone number renewals and 5-day grace period audit...');
          const { VoiceBillingService } = await import('../billing/voice-billing.service');
          const auditResult = await VoiceBillingService.processNumberRenewalsAndGracePeriod();
          console.log('[VoiceforceWorker] Daily renewal audit completed:', auditResult);
          break;
        }

        default:
          console.warn(`[VoiceforceWorker] Unknown job type: ${jobType}`);
      }
    },
    {
      connection: redis,
      concurrency: 10,
      limiter: {
        max: 5,
        duration: 1000 // Max 5 calls per second (CPS) to protect carriers
      }
    }
  );

  worker.on('failed', (job, err) => {
    if (err.message !== 'CONCURRENCY_LIMIT_REACHED') {
      console.error(`[VoiceforceWorker] Job ${job?.id} failed:`, err.message);
    }
  });

  return worker;
}
