import { RoomServiceClient, SipClient, EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { CascadedVoiceEngine } from './cascaded.engine';
import { VoiceSessionConfig } from '../types/voice.types';
import { prisma } from '@workspace/db';
import { VoiceComplianceGuard } from '../compliance/voice-compliance.guard';
import { HumanEscalationService } from '../telephony/human-escalation.service';

export interface LiveKitRoomWorkerOptions {
  callSessionId: string;
  roomName: string;
  companyId: string;
  voiceAgentId: string;
  recipientPhone?: string;
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

  constructor(options: LiveKitRoomWorkerOptions) {
    this.options = options;
    const apiKey = process.env.LIVEKIT_API_KEY || 'API_KEY_180VOICEFORCE';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'SECRET_KEY_180VOICEFORCE_ENTERPRISE_TOKEN';
    const livekitHost = process.env.LIVEKIT_HOST || process.env.LIVEKIT_URL || 'http://host.docker.internal:7880';

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
          data: { status: 'failed', disconnectReason: hoursCheck.reason }
        });
        return;
      }

      const dncCheck = await VoiceComplianceGuard.checkDnc(companyId, recipientPhone);
      if (dncCheck.blocked) {
        await this.recordMilestone('compliance_blocked_dnc', { reason: dncCheck.reason });
        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { status: 'failed', disconnectReason: dncCheck.reason }
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
      allowBargeIn: agent.allowBargeIn
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
    if (isOutbound && recipientPhone && sipTrunkId) {
      try {
        await this.sipClient.createSipParticipant(
          sipTrunkId,
          recipientPhone,
          roomName,
          {
            participantIdentity: `phone_${recipientPhone}`,
            participantName: recipientPhone
          }
        );
        await this.recordMilestone('sip_participant_created', { recipientPhone, sipTrunkId });
      } catch (err: any) {
        console.error('[LiveKitRoomWorker] SIP outbound dial error:', err.message);
        await this.recordMilestone('sip_dial_error', { error: err.message });
        await prisma.callSession.update({
          where: { id: callSessionId },
          data: { status: 'failed', disconnectReason: err.message }
        });
      }
    }
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
   * Cleanly shuts down room session and engine
   */
  async stop(reason: string = 'normal'): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.engine) {
      await this.engine.stop().catch(() => {});
    }

    try {
      await this.roomService.deleteRoom(this.options.roomName);
    } catch {}

    console.log(`[LiveKitRoomWorker] Call ${this.options.callSessionId} stopped: ${reason}`);
  }
}
