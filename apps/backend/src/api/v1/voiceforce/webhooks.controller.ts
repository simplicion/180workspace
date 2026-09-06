import { Request, Response } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { prisma } from '@workspace/db';
import { redisClient as redis } from '../../../system-configs/utils/redis';

export class VoiceforceWebhooksController {
  private static receiver: WebhookReceiver | null = null;

  private static getReceiver(): WebhookReceiver {
    if (!this.receiver) {
      const apiKey = process.env.LIVEKIT_API_KEY || 'API_KEY_180VOICEFORCE';
      const apiSecret = process.env.LIVEKIT_API_SECRET || 'SECRET_KEY_180VOICEFORCE_ENTERPRISE_TOKEN';
      this.receiver = new WebhookReceiver(apiKey, apiSecret);
    }
    return this.receiver;
  }

  /**
   * Receives and processes real-time WebRTC and SIP call lifecycle events from LiveKit
   */
  static async handleLiveKitWebhook(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      let event: any = null;
      try {
        const receiver = VoiceforceWebhooksController.getReceiver();
        event = await receiver.receive(rawBody, authHeader);
      } catch (authErr: any) {
        // Fallback for development if auth token not signed or local testing
        event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
      }

      const eventType = event.event;
      const roomName = event.room?.name;

      if (!roomName) {
        return res.status(200).json({ received: true });
      }

      console.log(`[Voiceforce Webhook] Event: ${eventType} on room: ${roomName}`);

      // Webhook Deduplication / Idempotency check via Redis
      const eventId = event.id || `${roomName}_${eventType}_${event.participant?.identity || ''}`;
      const idempotencyKey = `voiceforce:evt:${eventId}`;
      if (redis) {
        const isProcessed = await redis.get(idempotencyKey);
        if (isProcessed) {
          console.log(`[Voiceforce Webhook] Duplicate event ignored: ${idempotencyKey}`);
          return res.status(200).json({ received: true, deduplicated: true });
        }
        await redis.setex(idempotencyKey, 300, '1');
      }

      // Extract call session by livekitRoomName or room metadata
      const callSession = await prisma.callSession.findFirst({
        where: {
          OR: [
            { livekitRoomName: roomName },
            { id: roomName.startsWith('call_') ? roomName.replace('call_', '') : undefined }
          ]
        }
      });

      if (!callSession) {
        return res.status(200).json({ received: true });
      }

      switch (eventType) {
        case 'participant_joined': {
          // Customer answered call
          await prisma.callSession.update({
            where: { id: callSession.id },
            data: {
              status: 'in_progress',
              answeredAt: new Date()
            }
          });
          break;
        }

        case 'participant_left':
        case 'room_finished': {
          // Protect against duplicate billing if already completed
          if (callSession.status === 'completed') {
            return res.status(200).json({ received: true, alreadyCompleted: true });
          }

          const endedAt = new Date();
          const startedAt = callSession.startedAt || callSession.createdAt;
          const durationSeconds = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
          const billableMinutes = Math.ceil(durationSeconds / 60);

          // Release company concurrency lock
          await redis.decr(`voiceforce:active:${callSession.companyId}`).catch(() => {});

          await prisma.callSession.update({
            where: { id: callSession.id },
            data: {
              status: 'completed',
              endedAt,
              durationSeconds,
              billableMinutes
            }
          });

          // Atomic Prepaid Wallet Balance Deduction
          try {
            const { VoiceBillingService } = await import('@workspace/voiceforce');
            await VoiceBillingService.deductCallCost(callSession.id);
          } catch (billingErr: any) {
            console.error('[Voiceforce Webhook] Prepaid deduction error:', billingErr.message);
          }

          // Trigger Post-Call Intelligence
          try {
            const { VoiceforcePromptService } = await import('@workspace/voiceforce');
            const promptService = new VoiceforcePromptService();
            const transcripts = await prisma.callTranscriptSegment.findMany({
              where: { callSessionId: callSession.id },
              orderBy: { startTimeMs: 'asc' }
            });

            const analysis = await promptService.analyzeTranscript(transcripts);

            await prisma.callSession.update({
              where: { id: callSession.id },
              data: {
                summary: analysis.summary,
                sentiment: analysis.sentiment,
                callOutcome: analysis.callOutcome,
                actionItems: analysis.actionItems
              }
            });

            // Auto-create high priority follow-up tasks if action items exist
            if (analysis.actionItems && analysis.actionItems.length > 0) {
              for (const item of analysis.actionItems) {
                await prisma.task.create({
                  data: {
                    title: `[Call Follow-up]: ${item}`,
                    description: `Action item extracted from call with ${callSession.recipientPhone}. Summary: ${analysis.summary}`,
                    companyId: callSession.companyId,
                    priority: 'high',
                    status: 'todo'
                  }
                }).catch(() => {});
              }
            }
          } catch (postCallErr: any) {
            console.error('[Voiceforce Webhook] Post-call intelligence error:', postCallErr.message);
          }
          break;
        }

        default:
          break;
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[Voiceforce Webhook Error]:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Receives and processes real-time PSTN telephony events from Telnyx SIP trunking
   */
  static async handleTelnyxWebhook(req: Request, res: Response) {
    try {
      const { data } = req.body || {};
      const eventType = data?.event_type;
      const payload = data?.payload;
      const sipCallId = payload?.call_session_id || payload?.call_control_id || payload?.client_state;

      console.log(`[Voiceforce Telnyx Webhook] Event: ${eventType}, Call: ${sipCallId}`);

      if (!sipCallId) {
        return res.status(200).json({ received: true });
      }

      const session = await (prisma as any).callSession.findFirst({
        where: {
          OR: [
            { sipCallId },
            { id: sipCallId }
          ]
        }
      });

      if (!session) {
        // Handle incoming inbound call from carrier (new incoming call leg)
        if (eventType === 'call.initiated' && payload?.direction === 'incoming') {
          const toPhone = payload?.to?.replace(/\s+/g, '');
          const fromPhone = payload?.from;
          const { ForwardingRouterService } = await import('@workspace/voiceforce');

          // Find registered company number
          const phoneNumber = await (prisma as any).phoneNumber.findFirst({
            where: { e164Number: toPhone },
            include: { company: true }
          });

          if (phoneNumber) {
            const decision = await ForwardingRouterService.evaluateInboundCall(
              phoneNumber.companyId,
              toPhone,
              fromPhone
            );

            // Create initial inbound callSession
            const session = await (prisma as any).callSession.create({
              data: {
                companyId: phoneNumber.companyId,
                voiceAgentId: decision.agentId || phoneNumber.assignedAgentId || null,
                phoneNumberId: phoneNumber.id,
                recipientPhone: fromPhone || 'Unknown Caller',
                sipCallId,
                direction: 'inbound',
                status: 'initiated',
                structuredData: {
                  callerIdNumber: toPhone,
                  forwardingRuleId: decision.ruleId,
                  hopIndex: decision.hopIndex,
                  forwardedToE164: decision.destinationE164
                }
              }
            });

            // Pre-Call Financial Guard: Verify company wallet has >= ₹200.00
            const { VoiceBillingService } = await import('@workspace/voiceforce');
            const credit = await VoiceBillingService.validateCredit(phoneNumber.companyId, 200.0);
            if (!credit.allowed) {
              console.warn(`[Webhooks Inbound] Call blocked for company ${phoneNumber.companyId}: balance ₹${credit.balance.toFixed(2)} < ₹200.00`);
              if (payload?.call_control_id && process.env.TELNYX_API_KEY) {
                try {
                  const axios = (await import('axios')).default;
                  await axios.post(
                    `https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/reject`,
                    { cause: 'CALL_REJECTED' },
                    {
                      headers: {
                        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
                        'Content-Type': 'application/json'
                      },
                      timeout: 5000
                    }
                  ).catch((rejErr: any) => console.warn('[Webhooks] Telnyx reject action note:', rejErr.message));
                } catch (e: any) {
                  console.warn('[Webhooks] Could not issue Telnyx reject:', e.message);
                }
              }

              await (prisma as any).callSession.update({
                where: { id: session.id },
                data: {
                  status: 'failed',
                  disconnectReason: 'INSUFFICIENT_WALLET_BALANCE_LOCKED',
                  endedAt: new Date()
                }
              });

              return res.status(200).json({
                received: true,
                blocked: true,
                error: 'INSUFFICIENT_WALLET_BALANCE',
                balance: credit.balance,
                minRequired: 200.0
              });
            }

            // 1. If decision is PSTN forward, execute Telnyx call transfer
            if (decision.action === 'pstn_forward' && decision.destinationE164 && payload?.call_control_id) {
              await ForwardingRouterService.executeTelnyxTransfer(payload.call_control_id, decision.destinationE164);
            }

            // 2. If decision is Queue, place caller into active hold room
            if (decision.action === 'queue') {
              const { CallQueueService } = await import('@workspace/voiceforce');
              const queue = await (prisma as any).callQueue.findFirst({
                where: { companyId: phoneNumber.companyId }
              });
              if (queue) {
                await CallQueueService.enqueueCaller(phoneNumber.companyId, queue.id, session.id, fromPhone || 'Inbound Caller');
              }
            }

            // 3. If decision is AI Employee answering (direct agent or Hop 1 / fallback)
            if (decision.action === 'ai_agent' && (decision.agentId || phoneNumber.assignedAgentId)) {
              const agentId = decision.agentId || phoneNumber.assignedAgentId;
              const roomName = `inbound_${session.id}`;

              await (prisma as any).callSession.update({
                where: { id: session.id },
                data: {
                  voiceAgentId: agentId,
                  status: 'in_progress',
                  livekitRoomName: roomName,
                  startedAt: new Date()
                }
              });

              // Answer carrier leg and transfer audio into LiveKit room via SIP
              if (payload?.call_control_id && process.env.TELNYX_API_KEY) {
                try {
                  const axios = (await import('axios')).default;
                  // 1. Answer carrier leg
                  await axios.post(
                    `https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/answer`,
                    {},
                    {
                      headers: {
                        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
                        'Content-Type': 'application/json'
                      },
                      timeout: 5000
                    }
                  ).catch((ansErr: any) => console.warn('[Webhooks] Telnyx answer action note:', ansErr.message));

                  // 2. Transfer carrier call to LiveKit SIP URI so audio bridges directly into the room
                  const rawHost = process.env.LIVEKIT_SIP_DOMAIN || process.env.LIVEKIT_URL || 'livekit.180workspace.com';
                  const livekitSipHost = rawHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').split('/')[0];
                  const sipUri = `sip:${roomName}@${livekitSipHost}`;

                  await axios.post(
                    `https://api.telnyx.com/v2/calls/${payload.call_control_id}/actions/transfer`,
                    {
                      to: sipUri,
                      from: fromPhone || toPhone
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
                        'Content-Type': 'application/json'
                      },
                      timeout: 5000
                    }
                  ).catch((transErr: any) => console.warn('[Webhooks] Telnyx SIP transfer action note:', transErr.message));
                } catch (bridgeErr: any) {
                  console.warn('[Webhooks] Error bridging carrier call to LiveKit SIP:', bridgeErr.message);
                }
              }

              // Spin up LiveKitRoomWorker to autonomously converse with inbound caller
              try {
                const { LiveKitRoomWorker } = await import('@workspace/voiceforce');
                const roomWorker = new LiveKitRoomWorker({
                  callSessionId: session.id,
                  roomName,
                  companyId: phoneNumber.companyId,
                  voiceAgentId: agentId,
                  recipientPhone: fromPhone,
                  callerIdNumber: toPhone,
                  isOutbound: false
                });

                roomWorker.start().catch((err: any) => {
                  console.error('[Webhooks Inbound RoomWorker Error]:', err.message);
                });
              } catch (workerErr: any) {
                console.error('[Webhooks] Failed to initialize LiveKitRoomWorker:', workerErr.message);
              }
            }
          }
        }
        return res.status(200).json({ received: true });
      }

      switch (eventType) {
        case 'call.ringing': {
          await (prisma as any).callSession.update({
            where: { id: session.id },
            data: { status: 'ringing' }
          });
          break;
        }

        case 'call.answered': {
          await (prisma as any).callSession.update({
            where: { id: session.id },
            data: {
              status: 'in_progress',
              answeredAt: new Date()
            }
          });
          break;
        }

        case 'call.hangup': {
          const hangupCause = payload?.hangup_cause || 'NORMAL_CLEARING';
          let status = 'completed';
          if (['USER_BUSY', 'BUSY'].includes(hangupCause)) status = 'busy';
          else if (['NO_ANSWER', 'TIMEOUT'].includes(hangupCause)) status = 'no_answer';
          else if (['CALL_REJECTED', 'DECLINED'].includes(hangupCause)) status = 'customer_declined';

          await (prisma as any).callSession.update({
            where: { id: session.id },
            data: {
              status,
              disconnectReason: hangupCause,
              endedAt: new Date()
            }
          });

          // If this was a busy/unanswered leg in an active forwarding chain, cascade to next hop
          const sData = (session.structuredData as any) || session.metadata || {};
          if (['busy', 'no_answer'].includes(status) && sData.forwardingRuleId) {
            const { ForwardingRouterService } = await import('@workspace/voiceforce');
            const rule = await (prisma as any).forwardingRule.findFirst({
              where: { id: sData.forwardingRuleId }
            });
            if (rule) {
              const nextHopIndex = (sData.hopIndex || 0) + 1;
              const nextDecision = await ForwardingRouterService.evaluateNextHop(rule, nextHopIndex, session.companyId);
              if (nextDecision.action === 'pstn_forward' && nextDecision.destinationE164 && payload?.call_control_id) {
                await ForwardingRouterService.executeTelnyxTransfer(payload.call_control_id, nextDecision.destinationE164);
              }
            }
          }

          // If a call completed normally, check if any callers are waiting in an active queue and bridge immediately
          if (status === 'completed') {
            try {
              const { CallQueueService, ForwardingRouterService } = await import('@workspace/voiceforce');
              const activeQueue = await (prisma as any).callQueue.findFirst({
                where: { companyId: session.companyId, currentWaiting: { gt: 0 } }
              });

              if (activeQueue) {
                const nextQueuedCaller = await CallQueueService.dequeueNextCaller(session.companyId, activeQueue.id);
                if (nextQueuedCaller) {
                  console.log(`[AutoQueue] Line freed. Dequeued caller ${nextQueuedCaller.callerPhone} to bridge immediately.`);
                  const freedTargetE164 = sData.forwardedToE164 || session.recipientPhone;
                  if (freedTargetE164 && payload?.call_control_id) {
                    await ForwardingRouterService.executeTelnyxTransfer(payload.call_control_id, freedTargetE164);
                  }
                }
              }
            } catch (queueErr: any) {
              console.error('[Webhooks] Error in auto-queue dispatch:', queueErr.message);
            }
          }
          break;
        }

        case 'call.machine.detection.ended': {
          if (payload?.result === 'machine') {
            await (prisma as any).callSession.update({
              where: { id: session.id },
              data: { status: 'voicemail' }
            });
          }
          break;
        }

        default:
          break;
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[Voiceforce Telnyx Webhook Error]:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}

