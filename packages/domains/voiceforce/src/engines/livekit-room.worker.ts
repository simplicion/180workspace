import { RoomServiceClient, SipClient, EgressClient, EncodedFileOutput, EncodedFileType, S3Upload, AccessToken } from 'livekit-server-sdk';

// Safe lazy accessor for @livekit/rtc-node to prevent server crashes in environments without native binaries (e.g. musl/Alpine)
let _rtcNodeModule: any = undefined;
function getRtcNode(): any {
  if (_rtcNodeModule !== undefined) return _rtcNodeModule;
  try {
    _rtcNodeModule = require('@livekit/rtc-node');
  } catch (err: any) {
    console.warn('[LiveKitRoomWorker] Optional @livekit/rtc-node native module not loaded:', err.message);
    _rtcNodeModule = null;
  }
  return _rtcNodeModule;
}
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
  private rtcRoom: any = null;
  private audioSource: any = null;
  private audioTrack: any = null;
  private audioFrameQueue: any[] = [];
  private isDrainingAudioQueue: boolean = false;

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

    // 2b. Connect WebRTC RTC Agent & Publish Audio Track to LiveKit Room
    try {
      const apiKey = process.env.LIVEKIT_API_KEY || 'API_KEY_180VOICEFORCE';
      const apiSecret = process.env.LIVEKIT_API_SECRET || 'SECRET_KEY_180VOICEFORCE_ENTERPRISE_TOKEN';
      const livekitHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || 'https://livekit.180workspace.com';

      const agentToken = new AccessToken(apiKey, apiSecret, {
        identity: `agent_${voiceAgentId.slice(0, 8)}_${Date.now()}`,
        name: 'Voiceforce AI Agent'
      });
      agentToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      });
      const jwt = await agentToken.toJwt();

      const rtc = getRtcNode();
      if (!rtc) {
        console.warn('[LiveKitRoomWorker] RTC agent connect skipped: native RTC driver unavailable.');
      } else {
        this.rtcRoom = new rtc.Room();
        await this.rtcRoom.connect(livekitHost, jwt);

        this.audioSource = new rtc.AudioSource(16000, 1, 10000);
        this.audioTrack = rtc.LocalAudioTrack.createAudioTrack('agent_voice', this.audioSource);
        await this.rtcRoom.localParticipant?.publishTrack(
          this.audioTrack,
          new rtc.TrackPublishOptions({ source: rtc.TrackSource.SOURCE_MICROPHONE })
        );

        this.rtcRoom.on(rtc.RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
          console.log(`[LiveKitRoomWorker] Subscribed to remote track ${track.sid} (${track.kind}) from ${participant.identity}`);
          if (track.kind === rtc.TrackKind.KIND_AUDIO) {
            this.attachRemoteAudioStream(track);
          }
        });

        // Attach any tracks from participants already present in the room
        for (const [, p] of this.rtcRoom.remoteParticipants) {
          for (const [, pub] of (p as any).trackPublications) {
            if (pub.track && pub.track.kind === rtc.TrackKind.KIND_AUDIO) {
              this.attachRemoteAudioStream(pub.track);
            }
          }
        }
        await this.recordMilestone('rtc_agent_audio_bridged');
      }
    } catch (rtcErr: any) {
      console.warn('[LiveKitRoomWorker] RTC agent connect warning:', rtcErr.message);
    }

    // 3. Fetch Agent & Compile Dynamic Business Brain (Catalog, Pricing, Past Interactions)
    const [agent, company] = await Promise.all([
      prisma.voiceAgent.findUnique({ where: { id: voiceAgentId } }),
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true } })
    ]);

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
      ? VoiceComplianceGuard.formatComplianceGreeting(agent.name, company?.name || '180workspace', agent.firstMessage || undefined)
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
        // 1. Enqueue 20ms frames into WebRTC audio track so telephone caller hears agent over RTP
        if (this.audioSource) {
          try {
            const sampleRate = 16000;
            const channels = 1;
            const samplesPerFrame = 320; // 20ms frame at 16kHz
            const bytesPerFrame = samplesPerFrame * 2;
            const cleanBytes = new Uint8Array(audioChunk);

            for (let offset = 0; offset < cleanBytes.byteLength; offset += bytesPerFrame) {
              const end = Math.min(offset + bytesPerFrame, cleanBytes.byteLength);
              const slice = cleanBytes.subarray(offset, end);
              const numSamples = Math.floor(slice.byteLength / 2);
              if (numSamples === 0) continue;

              const pcmChunk = new Int16Array(
                slice.buffer.slice(slice.byteOffset, slice.byteOffset + numSamples * 2)
              );
              const rtc = getRtcNode();
              if (rtc) {
                const frame = new rtc.AudioFrame(pcmChunk, sampleRate, channels, numSamples);
                this.audioFrameQueue.push(frame);
              }
            }
            this.drainAudioQueue();
          } catch (err: any) {
            console.warn('[LiveKitRoomWorker] audioChunk enqueue note:', err.message);
          }
        }

        // 2. Broadcast audio chunk to room participants via LiveKit data channel
        const audioPacket = Buffer.from(JSON.stringify({
          type: 'audio_chunk',
          audioBase64: audioChunk.toString('base64'),
          timestamp: Date.now()
        }));
        await this.roomService.sendData(roomName, audioPacket, 0).catch(() => {});
      },

      onInterrupted: async () => {
        this.audioFrameQueue = [];
        if (this.audioSource) {
          this.audioSource.clearQueue();
        }
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
        const { isOutbound, recipientPhone, callSessionId } = this.options;

        // Check if carrier webhook or external event marked callSession as failed/busy/ended
        const dbSession = await prisma.callSession.findUnique({
          where: { id: callSessionId },
          select: { status: true, disconnectReason: true }
        });

        if (dbSession && ['failed', 'busy', 'completed', 'customer_declined'].includes(dbSession.status)) {
          await this.stop(dbSession.disconnectReason || dbSession.status);
          return;
        }

        const participants = await this.roomService.listParticipants(this.options.roomName);

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
   * Smoothly drains queued 20ms audio frames into WebRTC AudioSource
   */
  private async drainAudioQueue(): Promise<void> {
    if (this.isDrainingAudioQueue || !this.audioSource) return;
    this.isDrainingAudioQueue = true;

    try {
      while (this.audioFrameQueue.length > 0) {
        const frame = this.audioFrameQueue.shift();
        if (!frame || !this.audioSource) break;
        try {
          await this.audioSource.captureFrame(frame);
        } catch (err: any) {
          console.warn('[LiveKitRoomWorker] captureFrame note:', err.message);
        }
      }
    } finally {
      this.isDrainingAudioQueue = false;
    }
  }

  /**
   * Subscribes to remote participant incoming audio stream and feeds PCM frames into AI voice engine
   */
  private attachRemoteAudioStream(track: any): void {
    const rtc = getRtcNode();
    if (!rtc) return;
    const stream = new rtc.AudioStream(track, 16000, 1);
    (async () => {
      try {
        for await (const frame of stream) {
          if (!this.isRunning) break;
          const pcmBuffer = Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
          this.engine?.processIncomingAudio(pcmBuffer);
        }
      } catch (streamErr: any) {
        console.warn('[LiveKitRoomWorker] AudioStream read warning:', streamErr.message);
      }
    })();
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
    if (this.audioSource) {
      this.audioSource.clearQueue();
    }
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

    if (this.audioSource) {
      try {
        this.audioSource.clearQueue();
        await this.audioSource.close();
      } catch {}
      this.audioSource = null;
    }

    if (this.rtcRoom) {
      try {
        await this.rtcRoom.disconnect();
      } catch {}
      this.rtcRoom = null;
    }

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
          if (
            session.status === 'failed' ||
            (session.disconnectReason && (session.disconnectReason.includes('Carrier') || session.disconnectReason.includes('Error') || session.disconnectReason.includes('disabled') || session.disconnectReason.includes('SIP'))) ||
            reason.includes('error') ||
            reason.includes('restriction') ||
            reason.includes('Carrier')
          ) {
            finalStatus = 'failed';
            disconnectReason = session.disconnectReason || reason || 'Carrier connection failed';
          } else if (reason === 'no_answer' || reason === 'timeout') {
            finalStatus = 'no_answer';
            disconnectReason = 'Customer did not answer / timeout';
          } else if (reason === 'busy' || reason === 'rejected') {
            finalStatus = 'busy';
            disconnectReason = 'Line busy / call declined';
          } else {
            finalStatus = 'no_answer';
            disconnectReason = session.disconnectReason || 'Customer did not answer';
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

            // Automatic DNC Blacklisting: Detect customer opt-out under the hood
            const optOutDetected = /stop calling|remove me|do not call|don't call|unsubscribe|opt out|blacklist|never call/i.test(
              `${analysis.summary || ''} ${(analysis.actionItems || []).join(' ')} ${transcripts.map(t => t.text).join(' ')}`
            );
            if (optOutDetected && session.recipientPhone) {
              await VoiceComplianceGuard.addToDnc(session.companyId, session.recipientPhone, 'customer_opt_out_detected');
              console.log(`[VoiceComplianceGuard] Automatically blacklisted ${session.recipientPhone} in DNC registry based on call transcript opt-out.`);
            }

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
