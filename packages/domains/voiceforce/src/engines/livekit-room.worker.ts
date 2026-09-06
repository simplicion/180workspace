import { RoomServiceClient, SipClient, EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { CascadedVoiceEngine } from './cascaded.engine';
import { VoiceSessionConfig } from '../types/voice.types';
import { prisma } from '@workspace/db';
import { VoiceComplianceGuard } from '../compliance/voice-compliance.guard';
import { HumanEscalationService } from '../telephony/human-escalation.service';
import { VoiceBillingService } from '../billing/voice-billing.service';
import { VoiceforcePromptService } from '../prompts/voiceforce-prompts';

export interface LiveKitRoomWorkerOptions {
  callSessionId: string;
  roomName: string;
  companyId: string;
  voiceAgentId: string;
  recipientPhone?: string;
  callerIdNumber?: string;
  sipTrunkId?: string;
  isOutbound?: boolean;
}

export class LiveKitRoomWorker {
  private roomService: RoomServiceClient;
  private sipClient: SipClient;
  private egressClient: EgressClient | null = null;
  private engine: CascadedVoiceEngine | null = null;
  private options: LiveKitRoomWorkerOptions;
  private isRunning: boolean = false;
  private callStartTime: number = 0;
  private timelineMilestones: Array<{ timeMs: number; event: string; details?: any }> = [];
  private monitorTimer: NodeJS.Timeout | null = null;
  private hasCustomerAnswered: boolean = false;
  private greetingDelivered: boolean = false;

  constructor(options: LiveKitRoomWorkerOptions) {
    this.options = options;
    const apiKey = process.env.LIVEKIT_API_KEY || 'API_KEY_180VOICEFORCE';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'SECRET_KEY_180VOICEFORCE_ENTERPRISE_TOKEN';
    const livekitHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || 'https://livekit.180workspace.com';

    this.roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
    this.sipClient = new SipClient(livekitHost, apiKey, apiSecret);

    if (process.env.ENABLE_CALL_RECORDING === 'true' || process.env.VOICE_RECORDINGS_S3_BUCKET) {
      try {
        this.egressClient = new EgressClient(livekitHost, apiKey, apiSecret);
      } catch (err: any) {
        console.warn('[LiveKitRoomWorker] Egress client init skipped:', err.message);
      }
    }
  }

  private async recordMilestone(event: string, details?: any): Promise<void> {
    const elapsed = this.callStartTime ? Date.now() - this.callStartTime : 0;
    const milestone = { timeMs: elapsed, event, details, timestamp: new Date().toISOString() };
    this.timelineMilestones.push(milestone);

    try {
      const session = await prisma.callSession.findUnique({
        where: { id: this.options.callSessionId },
        select: { structuredData: true }
      });

      const currentData = (session?.structuredData as Record<string, any>) || {};
      const updatedTimeline = [...(currentData.timeline || []), milestone];

      await prisma.callSession.update({
        where: { id: this.options.callSessionId },
        data: {
          structuredData: {
            ...currentData,
            timeline: updatedTimeline
          }
        }
      });
    } catch {}
  }

  /**
   * Initializes the LiveKit room, launches SIP dialing if outbound, and attaches the AI Voice Engine
   */
  async start(): Promise<void> {
    const { roomName, callSessionId, companyId, voiceAgentId, recipientPhone, sipTrunkId, isOutbound } = this.options;
    this.callStartTime = Date.now();
    await this.recordMilestone('call_initialized', { isOutbound, recipientPhone });

    // 1. Compliance Guardrail: Verify calling hours & DNC for outbound calls
    if (isOutbound && recipientPhone) {
      const hoursCheck = VoiceComplianceGuard.validateCallingHours(recipientPhone);
      if (!hoursCheck.allowed) {
        await this.recordMilestone('compliance_blocked_calling_hours', { reason: hoursCheck.reason });
        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { status: 'failed', disconnectReason: hoursCheck.reason, endedAt: new Date() }
        });
        return;
      }

      const dncCheck = await VoiceComplianceGuard.checkDnc(companyId, recipientPhone);
      if (dncCheck.blocked) {
        await this.recordMilestone('compliance_blocked_dnc', { reason: dncCheck.reason });
        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { status: 'failed', disconnectReason: dncCheck.reason, endedAt: new Date() }
        });
        return;
      }
    }

    // 2. Ensure Room exists in LiveKit SFU
    await this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 4,
      metadata: JSON.stringify({ callSessionId, companyId, voiceAgentId })
    });
    await this.recordMilestone('livekit_room_created', { roomName });

    // 3. Fetch Agent & Compile Dynamic Business Brain (Catalog, Pricing, Past Interactions)
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgentId }
    });

    if (!agent) {
      throw new Error(`VoiceAgent ${voiceAgentId} not found in database`);
    }

    const { BusinessBrainService } = await import('../brain/business-brain.service');
    const compiledSystemPrompt = await BusinessBrainService.compileSystemPrompt(
      voiceAgentId,
      companyId,
      recipientPhone
    );

    // Format mandatory AI & recording compliance disclosure if outbound
    const firstMessage = isOutbound
      ? VoiceComplianceGuard.formatComplianceGreeting(agent.name, '180workspace', agent.firstMessage || undefined)
      : agent.firstMessage || undefined;

    const enabledTools = Array.isArray(agent.enabledToolNames)
      ? (agent.enabledToolNames as string[])
      : ['search_knowledge_base', 'create_task', 'create_crm_client', 'check_product_price'];

    const engineConfig: VoiceSessionConfig = {
      callSessionId,
      companyId,
      voiceAgentId,
      systemPrompt: compiledSystemPrompt,
      firstMessage,
      voiceId: agent.voiceId,
      language: agent.language,
      enabledTools,
      allowBargeIn: agent.allowBargeIn,
      autoGreet: !isOutbound // For outbound, wait until customer answers before delivering greeting
    };

    // 4. Initialize Call Recording Egress if configured (Cloudflare R2 Object Storage)
    if (this.egressClient) {
      try {
        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.VOICE_RECORDINGS_S3_BUCKET || '180workspace';
        const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT || '';
        const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || '';
        const secret = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
        const cdnBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.REELS_CDN_URL;

        const s3Key = `voiceforce/recordings/${companyId}/${callSessionId}.mp4`;
        const recordingUrl = cdnBase ? `${cdnBase}/${s3Key}` : `https://${bucket}.r2.dev/${s3Key}`;

        const fileOutput = new EncodedFileOutput({
          fileType: EncodedFileType.MP4,
          filepath: s3Key,
          output: {
            case: 's3',
            value: new S3Upload({
              endpoint,
              accessKey,
              secret,
              region: 'auto',
              bucket,
              forcePathStyle: true
            })
          }
        });

        await this.egressClient.startRoomCompositeEgress(roomName, { file: fileOutput }).catch((e) => {
          console.warn('[LiveKitRoomWorker] Egress composite start warning:', e.message);
        });

        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { recordingUrl }
        });
        await this.recordMilestone('recording_egress_started', { recordingUrl });
      } catch (egressErr: any) {
        console.warn('[LiveKitRoomWorker] Recording Egress setup skipped:', egressErr.message);
      }
    }

    // 5. Initialize Cascaded Voice Engine with Real-time DB persistence & Escalation Triggers
    this.engine = new CascadedVoiceEngine(engineConfig, {
      onTranscript: async (speaker, text, isFinal) => {
        if (!isFinal || !text.trim()) return;
        const now = Date.now();
        const elapsed = now - this.callStartTime;

        // Persist transcript segment to database
        await prisma.callTranscriptSegment.create({
          data: {
            callSessionId,
            speaker,
            text,
            startTimeMs: Math.max(0, elapsed - 3000),
            endTimeMs: elapsed,
            interrupted: false
          }
        }).catch((err) => console.error('[LiveKitRoomWorker] Error saving transcript:', err.message));

        // Check for human escalation trigger if user spoke
        if (speaker === 'user') {
          const escalation = HumanEscalationService.shouldTriggerEscalation(text);
          if (escalation.shouldEscalate) {
            await this.recordMilestone('human_escalation_triggered', { reason: escalation.reason });
            console.log(`[LiveKitRoomWorker] Call ${callSessionId} flagged for human escalation: ${escalation.reason}`);
          }
        }

        // Broadcast transcript event to room data channel
        const dataPacket = Buffer.from(JSON.stringify({
          type: 'transcript',
          speaker,
          text,
          timestamp: now
        }));
        await this.roomService.sendData(roomName, dataPacket, 0).catch(() => {});
      },

      onAudioChunk: async (audioChunk) => {
        // Broadcast audio chunk to room participants via LiveKit real-time data channel
        const audioPacket = Buffer.from(JSON.stringify({
          type: 'audio_chunk',
          audioBase64: audioChunk.toString('base64'),
          timestamp: Date.now()
        }));
        await this.roomService.sendData(roomName, audioPacket, 0).catch(() => {});
      },

      onInterrupted: async () => {
        await this.recordMilestone('barge_in_interruption');
      },

      onToolCallStart: async (toolName, args) => {
        await this.recordMilestone('tool_call_start', { toolName, args });
      },

      onToolCallEnd: async (toolName, result) => {
        await this.recordMilestone('tool_call_end', { toolName, result });
        await prisma.callToolExecution.create({
          data: {
            callSessionId,
            toolName,
            arguments: {},
            result: result || {},
            durationMs: 120,
            isSuccess: true
          }
        }).catch(() => {});
      },

      onError: async (err) => {
        await this.recordMilestone('engine_error', { message: err.message });
      },

      onCallEnd: async (reason) => {
        await this.recordMilestone('call_ended', { reason });
        await this.stop(reason);
      }
    });

    await this.engine.start();
    this.isRunning = true;
    await this.recordMilestone('engine_started');

    // 6. If Outbound PSTN Call, dispatch via LiveKit SIP to Telnyx
    if (isOutbound && recipientPhone) {
      const trunkId = (sipTrunkId && sipTrunkId.startsWith('ST_'))
        ? sipTrunkId
        : (process.env.LIVEKIT_SIP_TRUNK_ID || 'ST_FFXV3xAMx44y');
      
      let fromNumber = this.options.callerIdNumber;

      if (!fromNumber) {
        const sessionRec = await prisma.callSession.findUnique({
          where: { id: callSessionId },
          include: { phoneNumber: true }
        });
        if (sessionRec?.phoneNumber?.e164Number) {
          fromNumber = sessionRec.phoneNumber.e164Number;
        } else if ((sessionRec?.structuredData as any)?.callerIdNumber) {
          fromNumber = (sessionRec?.structuredData as any).callerIdNumber;
        } else if ((sessionRec as any)?.callerIdNumber) {
          fromNumber = (sessionRec as any).callerIdNumber;
        }
      }

      if (!fromNumber && voiceAgentId) {
        const agentPhone = await prisma.phoneNumber.findFirst({
          where: { companyId, assignedAgentId: voiceAgentId, status: 'active' }
        });
        if (agentPhone) {
          fromNumber = agentPhone.e164Number;
        }
      }

      if (!fromNumber && companyId) {
        const companyPhone = await prisma.phoneNumber.findFirst({
          where: { companyId, status: 'active' }
        });
        if (companyPhone) {
          fromNumber = companyPhone.e164Number;
        }
      }

      if (!fromNumber) {
        fromNumber = process.env.TELNYX_CALLER_ID || '+919381420546';
      }

      try {
        // Mark session as dialing
        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { status: 'dialing', startedAt: new Date() }
        });

        await this.sipClient.createSipParticipant(
          trunkId,
          recipientPhone,
          roomName,
          {
            participantIdentity: `phone_${recipientPhone}`,
            participantName: recipientPhone,
            fromNumber
          }
        );
        await this.recordMilestone('sip_participant_created', { recipientPhone, trunkId, fromNumber });

        // Launch active room participant lifecycle monitor
        this.startRoomLifecycleMonitor();
      } catch (err: any) {
        console.error('[LiveKitRoomWorker] SIP outbound dial error:', err.message);
        let errorMsg = err.message;
        if (errorMsg.includes('10039') || errorMsg.includes('country') || (recipientPhone.startsWith('+91') && errorMsg.includes('carrier'))) {
          errorMsg = `Carrier restriction: Telnyx trial account requires upgrade for +91 destinations (https://telnyx.com/upgrade). ${err.message}`;
        }
        await this.recordMilestone('sip_dial_error', { error: errorMsg });
        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { status: 'failed', disconnectReason: errorMsg, endedAt: new Date() }
        });
        await this.stop('sip_dial_error');
      }
    } else {
      // Inbound or Browser session - mark in progress immediately and monitor
      this.hasCustomerAnswered = true;
      this.greetingDelivered = true;
      await prisma.callSession.update({
        where: { id: callSessionId },
        data: { status: 'in_progress', startedAt: new Date(), answeredAt: new Date() }
      });
      this.startRoomLifecycleMonitor();
    }
  }

  /**
   * Periodically monitors the LiveKit room participants to track answer, conversation, and hangup events
   */
  private startRoomLifecycleMonitor(): void {
    if (this.monitorTimer) clearInterval(this.monitorTimer);

    const checkIntervalMs = 1500;
    const maxRingingTimeoutMs = 45000; // 45 seconds ringing timeout

    this.monitorTimer = setInterval(async () => {
      if (!this.isRunning) {
        if (this.monitorTimer) clearInterval(this.monitorTimer);
        return;
      }

      try {
        const participants = await this.roomService.listParticipants(this.options.roomName);
        const { isOutbound, recipientPhone, callSessionId } = this.options;

        // Find customer / phone participant
        const phoneParticipant = participants.find(p => 
          p.identity.startsWith('phone_') || 
          (recipientPhone && p.identity.includes(recipientPhone.replace(/\s+/g, ''))) ||
          p.identity.startsWith('user_') ||
          p.identity.startsWith('browser_')
        );

        const elapsed = Date.now() - this.callStartTime;

        if (phoneParticipant) {
          // Participant has connected and answered!
          if (!this.hasCustomerAnswered) {
            this.hasCustomerAnswered = true;
            console.log(`[LiveKitRoomWorker] Participant joined call ${callSessionId}: ${phoneParticipant.identity}`);

            await prisma.callSession.update({
              where: { id: callSessionId },
              data: { status: 'in_progress', answeredAt: new Date() }
            });
            await this.recordMilestone('customer_answered', { participant: phoneParticipant.identity });

            // Deliver initial AI employee greeting now that customer is listening
            if (!this.greetingDelivered && this.engine) {
              this.greetingDelivered = true;
              await this.engine.speakGreeting().catch((greetErr) => {
                console.warn('[LiveKitRoomWorker] Greeting delivery note:', greetErr.message);
              });
            }
          }
        } else {
          // Participant not currently in room
          if (this.hasCustomerAnswered) {
            // Customer answered earlier and now disconnected -> Call Completed
            console.log(`[LiveKitRoomWorker] Customer disconnected from call ${callSessionId}. Ending session.`);
            await this.stop('customer_hung_up');
          } else if (isOutbound && elapsed > maxRingingTimeoutMs) {
            // Outbound call timed out with no answer after 45s
            console.log(`[LiveKitRoomWorker] Outbound call ${callSessionId} timed out with no answer.`);
            await this.stop('no_answer');
          }
        }
      } catch (err: any) {
        // If room no longer exists, wrap up call cleanly
        if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
          await this.stop('room_closed');
        }
      }
    }, checkIntervalMs);
  }

  /**
   * Feed raw audio into engine (from WebRTC or softphone websocket)
   */
  processAudio(chunk: Buffer | Int16Array): void {
    if (this.engine && this.isRunning) {
      this.engine.processIncomingAudio(chunk);
    }
  }

  /**
   * Handles user barge-in
   */
  bargeIn(): void {
    if (this.engine) {
      this.engine.handleBargeIn();
    }
  }

  /**
   * Cleanly shuts down room session and engine, records duration, executes billing deduction, and triggers post-call intelligence
   */
  async stop(reason: string = 'normal'): Promise<void> {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.engine) {
      await this.engine.stop(reason).catch(() => {});
    }

    const { callSessionId } = this.options;

    try {
      const session = await prisma.callSession.findUnique({
        where: { id: callSessionId }
      });

      if (session && !['completed', 'failed', 'no_answer', 'busy'].includes(session.status)) {
        const endedAt = new Date();
        const startedAt = session.answeredAt || session.startedAt || session.createdAt;
        let durationSeconds = this.hasCustomerAnswered && session.answeredAt
          ? Math.max(1, Math.round((endedAt.getTime() - session.answeredAt.getTime()) / 1000))
          : 0;

        let finalStatus = 'completed';
        let disconnectReason = session.disconnectReason || reason;

        if (!this.hasCustomerAnswered) {
          if (reason === 'no_answer' || reason === 'timeout') {
            finalStatus = 'no_answer';
            disconnectReason = 'Customer did not answer / timeout';
          } else if (reason === 'busy' || reason === 'rejected') {
            finalStatus = 'busy';
            disconnectReason = 'Line busy / call declined';
          } else if (reason.includes('error') || reason.includes('restriction')) {
            finalStatus = 'failed';
            disconnectReason = disconnectReason || 'Carrier connection failed';
          } else {
            finalStatus = 'no_answer';
            disconnectReason = 'Customer did not answer';
          }
        }

        const billableMinutes = Math.ceil(durationSeconds / 60);

        await prisma.callSession.update({
          where: { id: callSessionId },
          data: {
            status: finalStatus,
            endedAt,
            durationSeconds,
            billableMinutes,
            disconnectReason
          }
        });

        // 1. Prepaid Wallet Balance Deduction (only if call connected)
        if (finalStatus === 'completed' && durationSeconds > 0) {
          try {
            await VoiceBillingService.deductCallCost(callSessionId);
          } catch (billingErr: any) {
            console.error('[LiveKitRoomWorker] Prepaid deduction error:', billingErr.message);
          }
        }

        // 2. Post-Call Intelligence (Summarization, Sentiment, Action Items)
        try {
          const promptService = new VoiceforcePromptService();
          const transcripts = await prisma.callTranscriptSegment.findMany({
            where: { callSessionId },
            orderBy: { startTimeMs: 'asc' }
          });

          if (transcripts.length > 0) {
            const analysis = await promptService.analyzeTranscript(transcripts);
            await prisma.callSession.update({
              where: { id: callSessionId },
              data: {
                summary: analysis.summary,
                sentiment: analysis.sentiment,
                callOutcome: analysis.callOutcome,
                actionItems: analysis.actionItems
              }
            });

            // Create tasks for action items
            if (analysis.actionItems && analysis.actionItems.length > 0) {
              for (const item of analysis.actionItems) {
                await prisma.task.create({
                  data: {
                    title: `[Call Follow-up]: ${item}`,
                    description: `Action item extracted from call with ${session.recipientPhone}. Summary: ${analysis.summary}`,
                    companyId: session.companyId,
                    priority: 'high',
                    status: 'todo'
                  }
                }).catch(() => {});
              }
            }
          }
        } catch (postCallErr: any) {
          console.error('[LiveKitRoomWorker] Post-call intelligence error:', postCallErr.message);
        }
      }
    } catch (dbErr: any) {
      console.error('[LiveKitRoomWorker] Error finalizing callSession in DB:', dbErr.message);
    }

    try {
      await this.roomService.deleteRoom(this.options.roomName);
    } catch {}

    console.log(`[LiveKitRoomWorker] Call ${this.options.callSessionId} stopped: ${reason}`);
  }
}
