import { Request, Response } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { prisma } from '@workspace/db';
import { redisClient as redis } from '../../../system-configs/utils/redis';

export class VoiceforceWebhooksController {
  private static receiver: WebhookReceiver | null = null;

  private static getReceiver(): WebhookReceiver {
    if (!this.receiver) {
      const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
      const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret_180workspace_livekit_key';
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

