import { Request, Response } from 'express';
import { prisma } from '@workspace/db';
import {
  TelnyxService,
  LiveKitTokenService,
  LiveKitRoomWorker,
  VoiceBillingService,
  ForwardingRouterService,
  CallQueueService,
  BusinessBrainService,
  NaturalLanguageTrainerService,
  GuardrailEnforcementEngine,
  DEFAULT_AGENT_GUARDRAIL_RULES,
  WarmHandoffService,
  PreFlightSimulatorService,
  RoiAnalyticsService,
  DailyBriefingService,
  CartesiaVoiceService,
  SentenceStreamer
} from '@workspace/voiceforce';
import { WalletService } from '@workspace/wallet';
import { AICompanyConfigService, AIProviderService } from '@workspace/ai';
import axios from 'axios';
import { redisClient } from '../../../system-configs/utils/redis';
import { Queue } from 'bullmq';

const telnyx = new TelnyxService();
const livekitTokenService = new LiveKitTokenService();
const voiceforceQueue = new Queue('voiceforce-queue', { connection: redisClient as any });

export const VoiceforceController = {
  // ─── Dashboard Metrics ───────────────────────────────────────────────────
  async getMetrics(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const [totalAgents, totalNumbers, totalCalls, answeredCalls, completedCalls, activeSessions, wallet, company] = await Promise.all([
        (prisma as any).voiceAgent.count({ where: { companyId } }),
        (prisma as any).phoneNumber.count({ where: { companyId } }),
        (prisma as any).callSession.count({ where: { companyId } }),
        (prisma as any).callSession.count({ where: { companyId, answeredAt: { not: null } } }),
        (prisma as any).callSession.findMany({
          where: { companyId, status: 'completed' },
          select: { durationSeconds: true, estimatedCostInr: true, callOutcome: true, structuredData: true }
        }),
        (prisma as any).callSession.findMany({
          where: { companyId, status: { in: ['dialing', 'ringing', 'in_progress'] } },
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: { voiceAgent: { select: { name: true } } }
        }),
        VoiceBillingService.getWalletDetails(companyId),
        (prisma as any).company.findUnique({
          where: { id: companyId },
          select: { currency: true, currencySymbol: true, country: true }
        })
      ]);

      const totalMinutes = Math.round(
        completedCalls.reduce((acc: number, c: any) => acc + (c.durationSeconds || 0), 0) / 60
      );
      const totalCostInr = Math.round(
        completedCalls.reduce((acc: number, c: any) => acc + (c.estimatedCostInr || 0), 0) * 100
      ) / 100;

      const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
      const avgDurationSec = completedCalls.length > 0
        ? Math.round(completedCalls.reduce((acc: number, c: any) => acc + (c.durationSeconds || 0), 0) / completedCalls.length)
        : 0;

      const conversions = completedCalls.filter((c: any) =>
        ['order_confirmed', 'appointment_booked', 'inquiry_resolved'].includes(c.callOutcome || '')
      ).length;
      const conversionRate = completedCalls.length > 0
        ? Math.round((conversions / completedCalls.length) * 100)
        : 0;

      return res.json({
        success: true,
        data: {
          totalAgents,
          totalNumbers,
          totalCalls,
          totalMinutes,
          totalCostInr,
          answerRate,
          avgDurationSec,
          conversionRate,
          activeCallsCount: activeSessions.length,
          activeSessions,
          wallet,
          currency: company?.currency || 'USD',
          currencySymbol: company?.currencySymbol || '$'
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Voice Agents CRUD ────────────────────────────────────────────────────
  async listAgents(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const agents = await prisma.voiceAgent.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { createdAt: 'desc' },
        include: { assignedNumbers: { select: { id: true, e164Number: true, friendlyName: true, routingMode: true } } }
      });
      return res.json({ success: true, data: agents });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getAgentDetails(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const agent = await (prisma as any).voiceAgent.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) },
        include: {
          assignedNumbers: {
            select: { id: true, e164Number: true, friendlyName: true, routingMode: true, provider: true, status: true }
          },
          guardrail: true,
          company: {
            select: { currency: true, currencySymbol: true }
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 5
          }
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'AI Voice Employee not found' });
      }

      // Self-heal: ensure default safety guardrail and boundaries exist
      if (!agent.guardrail) {
        agent.guardrail = await (prisma as any).voiceAgentGuardrail.create({
          data: {
            companyId: agent.companyId,
            voiceAgentId: agent.id,
            maxDiscountPercent: 10.0,
            maxDiscountAmount: 50.0,
            maxOrderValue: 1000.0,
            minLeadTimeHours: 2,
            pciRedactionEnabled: true,
            rules: DEFAULT_AGENT_GUARDRAIL_RULES
          }
        }).catch(() => null);
      }

      // Aggregate Performance KPIs for this specific agent
      const [
        totalCalls,
        completedCalls,
        ongoingCalls,
        allAgentCalls,
        runningCampaignsCount,
        allCampaignsCount
      ] = await Promise.all([
        (prisma as any).callSession.count({ where: { voiceAgentId: id } }),
        (prisma as any).callSession.count({ where: { voiceAgentId: id, status: 'completed' } }),
        (prisma as any).callSession.count({ where: { voiceAgentId: id, status: { in: ['in_progress', 'dialing', 'ringing'] } } }),
        (prisma as any).callSession.findMany({
          where: { voiceAgentId: id },
          select: {
            durationSeconds: true,
            estimatedCostInr: true,
            sentiment: true,
            callOutcome: true,
            status: true
          }
        }),
        (prisma as any).callCampaign.count({ where: { voiceAgentId: id, status: 'running' } }),
        (prisma as any).callCampaign.count({ where: { voiceAgentId: id } })
      ]);

      let totalTalkTimeSeconds = 0;
      let totalCostInr = 0;
      let positiveCount = 0;
      let leadsCaptured = 0;
      let ordersBooked = 0;

      for (const c of allAgentCalls) {
        totalTalkTimeSeconds += Number(c.durationSeconds || 0);
        totalCostInr += Number(c.estimatedCostInr || 0);

        if (c.sentiment === 'Positive' || c.callOutcome === 'completed' || c.callOutcome === 'appointment_booked' || c.callOutcome === 'order_created' || c.callOutcome === 'interested') {
          positiveCount++;
        }
        if (c.callOutcome === 'interested' || c.callOutcome === 'lead_captured') {
          leadsCaptured++;
        }
        if (c.callOutcome === 'order_created' || c.callOutcome === 'appointment_booked') {
          ordersBooked++;
        }
      }

      const successRate = completedCalls > 0 ? Math.round((positiveCount / completedCalls) * 100) : 0;
      const ongoingTasks = ongoingCalls + runningCampaignsCount;
      const completedTasks = completedCalls;

      // Recent Calls for this agent (take 25, ordered by createdAt desc)
      const recentCalls = await (prisma as any).callSession.findMany({
        where: { voiceAgentId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          recipientPhone: true,
          recipientName: true,
          direction: true,
          status: true,
          durationSeconds: true,
          estimatedCostInr: true,
          sentiment: true,
          callOutcome: true,
          recordingUrl: true,
          summary: true,
          disconnectReason: true,
          billedCurrency: true,
          totalBilledUsd: true,
          createdAt: true
        }
      });

      // Contextual customer reconnection check for recent calls
      const recipientPhones = Array.from(new Set(recentCalls.map((c: any) => c.recipientPhone).filter(Boolean)));
      let pastCallCounts: Record<string, number> = {};
      if (recipientPhones.length > 0) {
        const pastCounts = await (prisma as any).callSession.groupBy({
          by: ['recipientPhone'],
          where: {
            recipientPhone: { in: recipientPhones },
            companyId: agent.companyId
          },
          _count: { id: true }
        });
        pastCounts.forEach((p: any) => {
          if (p.recipientPhone) pastCallCounts[p.recipientPhone] = p._count.id;
        });
      }

      const currencySymbol = agent.company?.currencySymbol || '₹';

      const formattedCalls = recentCalls.map((c: any) => ({
        ...c,
        companyCurrencySymbol: currencySymbol,
        totalPriorCallsWithCompany: pastCallCounts[c.recipientPhone] || 1,
        isReturningCustomer: (pastCallCounts[c.recipientPhone] || 1) > 1
      }));

      return res.json({
        success: true,
        data: {
          agent,
          metrics: {
            totalCalls,
            completedCalls,
            ongoingCalls,
            totalTalkTimeSeconds,
            totalCostInr: parseFloat(totalCostInr.toFixed(2)),
            successRate,
            leadsCaptured,
            ordersBooked,
            ongoingTasks,
            completedTasks,
            totalCampaigns: allCampaignsCount
          },
          recentCalls: formattedCalls,
          briefing: await DailyBriefingService.generateBriefingForAgent(agent.id, agent.companyId)
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createAgent(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const {
        name, role, systemPrompt, voiceId, language, firstMessage,
        allowBargeIn, enabledToolNames, voiceSpeed, voiceTemperature,
        inactivityTimeoutMs, maxDurationSeconds, engineType, llmModel, modelId, sttModel, isActive,
        assignedPhoneId
      } = req.body;

      if (!name) return res.status(400).json({ error: 'Agent name is required' });

      const agent = await prisma.voiceAgent.create({
        data: {
          companyId,
          name,
          role: role || 'AI Assistant',
          systemPrompt: systemPrompt || 'You are Maya, an autonomous AI voice employee for this company.',
          voiceProvider: 'cartesia',
          voiceId: voiceId || '694f12bc-9263-4416-a1d8-0402e1c6e1d2',
          language: language || 'en-US',
          firstMessage: firstMessage || 'Hello! How can I help you today?',
          allowBargeIn: allowBargeIn ?? true,
          voiceSpeed: voiceSpeed !== undefined ? Number(voiceSpeed) : 1.0,
          voiceTemperature: voiceTemperature !== undefined ? Number(voiceTemperature) : 0.7,
          inactivityTimeoutMs: inactivityTimeoutMs !== undefined ? Number(inactivityTimeoutMs) : 5000,
          maxDurationSeconds: maxDurationSeconds !== undefined ? Number(maxDurationSeconds) : 600,
          engineType: engineType || 'cascaded',
          llmModel: llmModel || modelId || 'llama-3.3-70b-versatile',
          sttModel: sttModel || 'ink-2',
          isActive: isActive ?? true,
          enabledToolNames: enabledToolNames || ['search_knowledge_base', 'create_task', 'create_crm_client']
        }
      });

      // Ensure default safety guardrail and boundaries exist from birth
      await (prisma as any).voiceAgentGuardrail.create({
        data: {
          companyId,
          voiceAgentId: agent.id,
          maxDiscountPercent: 10.0,
          maxDiscountAmount: 50.0,
          maxOrderValue: 1000.0,
          minLeadTimeHours: 2,
          pciRedactionEnabled: true,
          rules: DEFAULT_AGENT_GUARDRAIL_RULES
        }
      }).catch(() => {});

      // If user selected a phone number to assign to this agent, link it immediately
      if (assignedPhoneId) {
        await (prisma as any).phoneNumber.update({
          where: { id: assignedPhoneId },
          data: { assignedAgentId: agent.id, routingMode: 'direct_agent' }
        }).catch(() => {});
      }

      return res.json({ success: true, data: agent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateAgent(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;
      const {
        name, role, systemPrompt, voiceId, language, firstMessage,
        allowBargeIn, enabledToolNames, voiceSpeed, voiceTemperature,
        inactivityTimeoutMs, maxDurationSeconds, engineType, llmModel, modelId, sttModel, isActive,
        assignedPhoneId
      } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) updateData.role = role;
      if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
      if (voiceId !== undefined) updateData.voiceId = voiceId;
      if (language !== undefined) updateData.language = language;
      if (firstMessage !== undefined) updateData.firstMessage = firstMessage;
      if (allowBargeIn !== undefined) updateData.allowBargeIn = Boolean(allowBargeIn);
      if (voiceSpeed !== undefined) updateData.voiceSpeed = Number(voiceSpeed);
      if (voiceTemperature !== undefined) updateData.voiceTemperature = Number(voiceTemperature);
      if (inactivityTimeoutMs !== undefined) updateData.inactivityTimeoutMs = Number(inactivityTimeoutMs);
      if (maxDurationSeconds !== undefined) updateData.maxDurationSeconds = Number(maxDurationSeconds);
      if (engineType !== undefined) updateData.engineType = engineType;
      if (llmModel !== undefined) updateData.llmModel = llmModel;
      else if (modelId !== undefined) updateData.llmModel = modelId;
      if (sttModel !== undefined) updateData.sttModel = sttModel;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (enabledToolNames !== undefined) updateData.enabledToolNames = enabledToolNames;

      const agent = await prisma.voiceAgent.update({
        where: { id },
        data: updateData
      });

      // Update phone number linkage if specified
      if (assignedPhoneId !== undefined) {
        if (assignedPhoneId) {
          // Unlink previous numbers assigned to this agent and link the new one
          await (prisma as any).phoneNumber.updateMany({
            where: { assignedAgentId: id, id: { not: assignedPhoneId } },
            data: { assignedAgentId: null }
          }).catch(() => {});

          await (prisma as any).phoneNumber.update({
            where: { id: assignedPhoneId },
            data: { assignedAgentId: id, routingMode: 'direct_agent' }
          }).catch(() => {});
        } else {
          // Unlink all numbers for this agent
          await (prisma as any).phoneNumber.updateMany({
            where: { assignedAgentId: id },
            data: { assignedAgentId: null }
          }).catch(() => {});
        }
      }

      return res.json({ success: true, data: agent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteAgent(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await prisma.company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const agent = await prisma.voiceAgent.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) }
      });
      if (!agent) {
        return res.status(404).json({ error: 'AI Voice Employee not found' });
      }

      // 1. Unlink assigned phone numbers
      await (prisma as any).phoneNumber.updateMany({
        where: { assignedAgentId: id },
        data: { assignedAgentId: null }
      }).catch(() => {});

      // 2. Unlink forwarding rules where fallbackAgentId === id
      await (prisma as any).forwardingRule.updateMany({
        where: { fallbackAgentId: id },
        data: { fallbackAgentId: null }
      }).catch(() => {});

      // 3. Delete guardrails and versions
      await (prisma as any).voiceAgentGuardrail.deleteMany({ where: { voiceAgentId: id } }).catch(() => {});
      await (prisma as any).voiceAgentVersion.deleteMany({ where: { voiceAgentId: id } }).catch(() => {});

      // 4. Find all campaigns belonging to this agent
      const campaigns = await (prisma as any).callCampaign.findMany({
        where: { voiceAgentId: id },
        select: { id: true }
      });
      const campaignIds = campaigns.map((c: any) => c.id);

      // 5. Find all call sessions associated with this agent or its campaigns
      const calls = await (prisma as any).callSession.findMany({
        where: {
          OR: [
            { voiceAgentId: id },
            ...(campaignIds.length > 0 ? [{ campaignId: { in: campaignIds } }] : [])
          ]
        },
        select: { id: true }
      });
      const callIds = calls.map((c: any) => c.id);

      if (callIds.length > 0) {
        await (prisma as any).callTranscriptSegment.deleteMany({ where: { callSessionId: { in: callIds } } }).catch(() => {});
        await (prisma as any).callToolExecution.deleteMany({ where: { callSessionId: { in: callIds } } }).catch(() => {});
        await (prisma as any).callEscalationEvent.deleteMany({ where: { callSessionId: { in: callIds } } }).catch(() => {});
        await (prisma as any).actionAuditLog.deleteMany({ where: { callSessionId: { in: callIds } } }).catch(() => {});
        await (prisma as any).voiceWalletTransaction.updateMany({
          where: { callSessionId: { in: callIds } },
          data: { callSessionId: null }
        }).catch(() => {});
        await (prisma as any).callSession.deleteMany({ where: { id: { in: callIds } } });
      }

      // 6. Delete campaigns
      if (campaignIds.length > 0) {
        await (prisma as any).callCampaign.deleteMany({ where: { id: { in: campaignIds } } });
      }

      // 7. Delete the voice agent record
      await prisma.voiceAgent.delete({ where: { id } });

      return res.json({ success: true, message: `AI Employee "${agent.name}" deleted successfully` });
    } catch (err: any) {
      console.error('[DeleteAgent Error]:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Cartesia Neural Voice Studio & Persona Customization (API v2026-08-14) ──
  async listCartesiaVoices(req: any, res: Response) {
    try {
      const { language, gender, search, onlyCloned } = req.query;
      const voices = await CartesiaVoiceService.listVoices({
        language: language ? String(language) : undefined,
        gender: gender ? String(gender) : undefined,
        search: search ? String(search) : undefined,
        onlyCloned: onlyCloned === 'true' || onlyCloned === '1'
      });

      console.log(`[VoiceforceController] Delivering ${voices.length} Cartesia voices (Cloned: ${voices.filter(v => v.isCloned).length})`);
      return res.json({
        success: true,
        count: voices.length,
        data: voices
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async previewCartesiaVoice(req: any, res: Response) {
    try {
      const { 
        voiceId, text, modelId, speed, volume, emotion, 
        locale, normalization, sampleRate, encoding, container, pronunciationDictId 
      } = req.body;
      if (!voiceId) {
        return res.status(400).json({ error: 'voiceId is required for preview' });
      }

      const preview = await CartesiaVoiceService.generateAudioPreview({
        voiceId,
        text,
        modelId,
        speed: speed !== undefined ? Number(speed) : undefined,
        volume: volume !== undefined ? Number(volume) : undefined,
        emotion: typeof emotion === 'string' ? emotion : Array.isArray(emotion) ? emotion[0] : undefined,
        locale: locale ? String(locale) : undefined,
        normalization: normalization ? String(normalization) : undefined,
        sampleRate: sampleRate ? Number(sampleRate) as any : undefined,
        encoding: encoding ? String(encoding) as any : undefined,
        container: container ? String(container) as any : undefined,
        pronunciationDictId: pronunciationDictId ? String(pronunciationDictId) : undefined
      });

      return res.json({
        success: true,
        data: preview
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async cloneCartesiaVoice(req: any, res: Response) {
    try {
      const { name, description, language = 'en', audioBase64, filename, mimeType } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Voice name is required' });
      }

      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio recording (audioBase64) is required for cloning' });
      }

      // Extract raw base64 data if prefixed with data:...;base64,
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
      const audioBuffer = Buffer.from(cleanBase64, 'base64');

      if (audioBuffer.length < 1000) {
        return res.status(400).json({ error: 'Audio sample is too short. Please provide at least 5-10 seconds of clear speech.' });
      }

      const newVoice = await CartesiaVoiceService.cloneVoiceFromAudio({
        name: name.trim(),
        description: description ? description.trim() : 'Custom voice clone',
        language,
        audioBuffer,
        filename: filename || 'recording.wav',
        mimeType: mimeType || 'audio/wav'
      });

      return res.status(201).json({
        success: true,
        message: `Custom Voice "${newVoice.name}" cloned successfully!`,
        data: newVoice
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async transcribeCartesiaAudio(req: any, res: Response) {
    try {
      const { audioBase64, filename, mimeType, model = 'ink-whisper', language = 'en', encoding, sampleRate } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required for transcription' });
      }

      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
      const audioBuffer = Buffer.from(cleanBase64, 'base64');

      const result = await CartesiaVoiceService.transcribeAudioFile({
        audioBuffer,
        filename: filename || 'audio.wav',
        mimeType: mimeType || 'audio/wav',
        model,
        language,
        encoding,
        sampleRate: sampleRate ? Number(sampleRate) : undefined
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getCartesiaEngineSpecs(req: any, res: Response) {
    try {
      const { agentId } = req.query;
      let keyterms: string[] = ['180workspace', 'Voiceforce', 'Cartesia'];

      if (agentId) {
        const agent = await (prisma as any).voiceAgent.findUnique({
          where: { id: String(agentId) },
          select: { name: true, role: true, company: { select: { name: true } } }
        });
        if (agent) {
          if (agent.name) keyterms.push(agent.name);
          if (agent.company?.name) keyterms.push(agent.company.name);
        }
      }

      const ttsWs = CartesiaVoiceService.buildTTSWebSocketUrl();
      const sttTurnsWs = CartesiaVoiceService.buildSTTTurnsWebSocketUrl({ keyterms });
      const sttManualWs = CartesiaVoiceService.buildSTTManualWebSocketUrl({ keyterms });

      return res.json({
        success: true,
        data: {
          version: CartesiaVoiceService.API_VERSION,
          tts: {
            websocket: ttsWs,
            recommendedModel: 'sonic-3.6',
            supportedEncodings: ['pcm_s16le', 'pcm_f32le', 'pcm_mulaw', 'pcm_alaw'],
            supportedSampleRates: [8000, 16000, 22050, 24000, 44100, 48000],
            protocols: {
              websocket: 'wss://api.cartesia.ai/tts/websocket (Sub-40ms realtime streaming)',
              sse: 'https://api.cartesia.ai/tts/sse (Server-sent events streaming)',
              bytes: 'https://api.cartesia.ai/tts/bytes (HTTP binary audio download / preview)'
            }
          },
          stt: {
            turnsWebsocket: sttTurnsWs,
            manualWebsocket: sttManualWs,
            batchTranscribeUrl: 'https://api.cartesia.ai/stt',
            recommendedModel: 'ink-2',
            multilingualModel: 'ink-preview',
            keyterms
          }
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Phone Numbers & Verification ─────────────────────────────────────────
  async listNumbers(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const numbers = await prisma.phoneNumber.findMany({
        where: { companyId },
        include: { assignedAgent: { select: { id: true, name: true } } }
      });
      return res.json({ success: true, data: numbers });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async searchAvailableNumbers(req: any, res: Response) {
    try {
      const { countryCode = 'US', areaCode } = req.query;
      const rawNumbers = await telnyx.searchNumbers(
        countryCode as string,
        10,
        areaCode ? String(areaCode) : undefined
      );

      // On Telnyx trial accounts, numbers are masked with hyphens (e.g. "+16192------").
      // We resolve each masked number into a distinct, unique E.164 phone number so React keys are unique
      // and each DID can be uniquely allocated and routed.
      const seen = new Set<string>();
      const processedNumbers = rawNumbers.map((item: any, idx: number) => {
        let phone = item.phoneNumber || '';
        const isMasked = phone.includes('-');

        if (isMasked) {
          let replacement = '';
          const hyphens = (phone.match(/-/g) || []).length;
          for (let i = 0; i < hyphens; i++) {
            replacement += Math.floor(Math.random() * 10);
          }
          let dIdx = 0;
          phone = phone.replace(/-/g, () => replacement[dIdx++] || '0');
        }

        // Guarantee strict uniqueness across all search results
        while (seen.has(phone)) {
          const lastDigit = Math.floor(Math.random() * 10);
          phone = phone.slice(0, -1) + lastDigit;
        }
        seen.add(phone);

        return {
          ...item,
          phoneNumber: phone,
          originalMask: isMasked ? item.phoneNumber : undefined,
          isSandbox: isMasked
        };
      });

      return res.json({ success: true, data: processedNumbers });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async purchaseNumber(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      let { phoneNumber, friendlyName, assignedAgentId } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // If phone number contains hyphens from a sandbox pool, convert to valid E.164 digits
      if (phoneNumber.includes('-')) {
        let replacement = '';
        const hyphens = (phoneNumber.match(/-/g) || []).length;
        for (let i = 0; i < hyphens; i++) {
          replacement += Math.floor(Math.random() * 10);
        }
        let dIdx = 0;
        phoneNumber = phoneNumber.replace(/-/g, () => replacement[dIdx++] || '0');
      }

      // Financial check: ₹149.00 monthly lease + ₹200.00 calling reserve = ₹349.00 required
      const credit = await VoiceBillingService.validateCredit(companyId, 349.0);
      if (!credit.allowed) {
        return res.status(402).json({
          error: 'INSUFFICIENT_WALLET_BALANCE',
          balance: credit.balance,
          minRequired: 349.0,
          recommended: 1000.0,
          message: `Dedicated number purchase requires ₹349.00 (₹149.00 monthly lease + ₹200.00 calling reserve). Current balance: ₹${credit.balance.toFixed(2)}. Please top up your wallet.`
        });
      }

      // Deduct ₹149 from wallet balance
      await VoiceBillingService.deductNumberPurchase(companyId, phoneNumber, 149.0);

      let isLiveCarrier = false;
      let providerId = `did_virtual_${Date.now()}`;

      // Try purchasing on live Telnyx carrier if available
      try {
        const purchaseResult = await telnyx.purchaseNumber(phoneNumber);
        if (purchaseResult.success) {
          isLiveCarrier = true;
          providerId = purchaseResult.phoneNumberId || purchaseResult.id || providerId;
          // Automatically bind newly acquired number to Telnyx Call Control / SIP connection
          await telnyx.assignNumberToConnection(phoneNumber).catch((bindErr: any) => {
            console.warn('[Voiceforce] Telnyx connection binding note:', bindErr.message);
          });
        } else {
          console.warn(`[Voiceforce] Telnyx live purchase note: ${purchaseResult.error}. Provisioning dedicated line.`);
        }
      } catch (carrierErr: any) {
        console.warn(`[Voiceforce] Carrier API note: ${carrierErr.message}. Provisioning dedicated line.`);
      }

      const record = await prisma.phoneNumber.create({
        data: {
          companyId,
          e164Number: phoneNumber,
          friendlyName: friendlyName || phoneNumber,
          provider: isLiveCarrier ? 'telnyx' : 'telnyx_virtual',
          providerId,
          assignedAgentId: assignedAgentId || null,
          status: 'active',
          monthlyRentalInr: 149.0,
          nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true
        }
      });

      return res.json({
        success: true,
        data: record,
        isLiveCarrier,
        message: isLiveCarrier
          ? 'Live PSTN number acquired from carrier!'
          : 'Dedicated virtual line activated for AI calling & simulation.'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async requestCallerIdVerification(req: any, res: Response) {
    try {
      const { phoneNumber, method = 'sms' } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      const result = await telnyx.requestCallerIdVerification(phoneNumber, method);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ success: true, verificationId: result.verificationId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async verifyCallerIdOtp(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { verificationId, phoneNumber, code, friendlyName, assignedAgentId } = req.body;

      const targetPhone = phoneNumber || verificationId;
      if (!targetPhone || !code) {
        return res.status(400).json({ error: 'Phone number and OTP code are required' });
      }

      const result = await telnyx.submitCallerIdOtp(targetPhone, code);
      if (!result.verified) {
        return res.status(400).json({ error: result.error || 'Invalid OTP code' });
      }

      const record = await prisma.phoneNumber.create({
        data: {
          companyId,
          e164Number: targetPhone,
          friendlyName: friendlyName || 'Verified Business Line',
          provider: 'verified_caller_id',
          providerId: verificationId || targetPhone,
          assignedAgentId: assignedAgentId || null,
          status: 'active'
        }
      });

      return res.json({ success: true, data: record });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateNumber(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const { friendlyName, assignedAgentId, status } = req.body;

      const updated = await (prisma as any).phoneNumber.update({
        where: { id, companyId },
        data: {
          ...(friendlyName !== undefined && { friendlyName }),
          ...(assignedAgentId !== undefined && { assignedAgentId: assignedAgentId || null }),
          ...(status !== undefined && { status })
        },
        include: { assignedAgent: { select: { id: true, name: true } } }
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async releaseNumber(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const num = await (prisma as any).phoneNumber.findFirst({
        where: { id, companyId }
      });
      if (!num) {
        return res.status(404).json({ error: 'Phone number not found' });
      }

      // Automatically release and delete the number from Telnyx carrier exchange
      try {
        const target = num.e164Number || num.providerId;
        const carrierRes = await telnyx.releaseNumber(target);
        if (!carrierRes.success && carrierRes.error) {
          console.warn('[Voiceforce] Telnyx carrier release notice:', carrierRes.error);
        }
      } catch (tErr: any) {
        console.warn('[Voiceforce] Telnyx carrier release notice:', tErr.message);
      }

      // Permanently remove from 180workspace database
      await (prisma as any).phoneNumber.delete({ where: { id } });
      return res.json({ 
        success: true, 
        message: `Phone number ${num.e164Number} permanently deleted from 180workspace and released from Telnyx.` 
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Call Forwarding & Routing Rules ───────────────────────────────────────
  async listForwardingRules(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const rules = await (prisma as any).forwardingRule.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { createdAt: 'desc' },
        include: {
          phoneNumber: { select: { id: true, e164Number: true, friendlyName: true } }
        }
      });
      return res.json({ success: true, data: rules });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createForwardingRule(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const {
        phoneNumberId,
        name,
        strategy = 'sequential',
        ringTimeoutSec = 20,
        destinations = [],
        scheduleEnabled = false,
        timezone = 'Asia/Kolkata',
        businessHours,
        fallbackType = 'ai_agent',
        fallbackAgentId,
        fallbackVoicemailEmail,
        maxHops = 4,
        whisperAnnouncement,
        isActive = true
      } = req.body;

      if (!phoneNumberId || !name) {
        return res.status(400).json({ error: 'Phone Number and Rule Name are required' });
      }

      // Create rule
      const rule = await (prisma as any).forwardingRule.create({
        data: {
          companyId,
          phoneNumberId,
          name,
          strategy,
          ringTimeoutSec: Number(ringTimeoutSec) || 20,
          destinations: Array.isArray(destinations) ? destinations : [],
          scheduleEnabled: Boolean(scheduleEnabled),
          timezone,
          businessHours: businessHours || null,
          fallbackType,
          fallbackAgentId: fallbackAgentId || null,
          fallbackVoicemailEmail: fallbackVoicemailEmail || null,
          maxHops: Number(maxHops) || 4,
          whisperAnnouncement: whisperAnnouncement || null,
          isActive: Boolean(isActive)
        },
        include: {
          phoneNumber: { select: { id: true, e164Number: true, friendlyName: true } }
        }
      });

      // Update phone number routing mode to forwarding_rule
      await (prisma as any).phoneNumber.update({
        where: { id: phoneNumberId },
        data: { routingMode: 'forwarding_rule' }
      });

      return res.status(201).json({ success: true, data: rule });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getForwardingRule(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const rule = await (prisma as any).forwardingRule.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) },
        include: {
          phoneNumber: true
        }
      });

      if (!rule) return res.status(404).json({ error: 'Forwarding rule not found' });
      return res.json({ success: true, data: rule });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateForwardingRule(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;
      const {
        name,
        strategy,
        ringTimeoutSec,
        destinations,
        scheduleEnabled,
        timezone,
        businessHours,
        fallbackType,
        fallbackAgentId,
        fallbackVoicemailEmail,
        maxHops,
        whisperAnnouncement,
        isActive
      } = req.body;

      const updated = await (prisma as any).forwardingRule.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(strategy !== undefined && { strategy }),
          ...(ringTimeoutSec !== undefined && { ringTimeoutSec: Number(ringTimeoutSec) }),
          ...(destinations !== undefined && { destinations }),
          ...(scheduleEnabled !== undefined && { scheduleEnabled: Boolean(scheduleEnabled) }),
          ...(timezone !== undefined && { timezone }),
          ...(businessHours !== undefined && { businessHours }),
          ...(fallbackType !== undefined && { fallbackType }),
          ...(fallbackAgentId !== undefined && { fallbackAgentId: fallbackAgentId || null }),
          ...(fallbackVoicemailEmail !== undefined && { fallbackVoicemailEmail }),
          ...(maxHops !== undefined && { maxHops: Number(maxHops) }),
          ...(whisperAnnouncement !== undefined && { whisperAnnouncement }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) })
        },
        include: {
          phoneNumber: { select: { id: true, e164Number: true, friendlyName: true } }
        }
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteForwardingRule(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const rule = await (prisma as any).forwardingRule.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) }
      });

      if (!rule) return res.status(404).json({ error: 'Rule not found' });

      await (prisma as any).forwardingRule.delete({ where: { id } });

      // Reset phone number routingMode
      await (prisma as any).phoneNumber.update({
        where: { id: rule.phoneNumberId },
        data: { routingMode: 'direct_agent' }
      }).catch(() => { });

      return res.json({ success: true, message: 'Forwarding rule removed successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async simulateForwardingRule(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;
      const { callerPhone, simulateBusyHop, forceAfterHours } = req.body;

      const { ForwardingRouterService } = await import('@workspace/voiceforce');
      const simulationResult = await ForwardingRouterService.simulatePipeline(
        id,
        {
          callerPhone: callerPhone || '+14155551234',
          simulateBusyHop: simulateBusyHop !== undefined && simulateBusyHop !== null ? Number(simulateBusyHop) : null,
          forceAfterHours: Boolean(forceAfterHours)
        },
        companyId
      );

      return res.json({
        success: true,
        message: 'Forwarding pipeline simulated successfully at ₹0 telecom cost',
        data: simulationResult
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Active Call Queues ───────────────────────────────────────────────────
  async listQueues(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const queues = await (prisma as any).callQueue.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: queues });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createQueue(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { name, maxQueueSize = 25, maxWaitTimeSec = 300, holdMusicUrl, announcePosition = true } = req.body;

      if (!name) return res.status(400).json({ error: 'Queue name is required' });

      const queue = await (prisma as any).callQueue.create({
        data: {
          companyId,
          name,
          maxQueueSize: Number(maxQueueSize) || 25,
          maxWaitTimeSec: Number(maxWaitTimeSec) || 300,
          holdMusicUrl: holdMusicUrl || null,
          announcePosition: Boolean(announcePosition)
        }
      });

      return res.status(201).json({ success: true, data: queue });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async listQueueWaitingCallers(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const callers = await CallQueueService.listWaitingCallers(companyId, id);
      return res.json({ success: true, data: callers });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async dequeueTakeover(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const nextCaller = await CallQueueService.dequeueNextCaller(companyId, id);
      if (!nextCaller) {
        return res.status(404).json({ error: 'No waiting callers in this queue' });
      }

      // Generate in-browser LiveKit room connection so human operator takes the call immediately
      const roomName = `queue_takeover_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token, url } = await livekitTokenService.generateToken({
        roomName,
        participantIdentity: `operator_${req.user?.id || 'supervisor'}`,
        participantName: req.user?.name || 'Live Supervisor',
        metadata: { callSessionId: nextCaller.callSessionId, isTakeover: true }
      });

      return res.json({
        success: true,
        data: {
          caller: nextCaller,
          token,
          url,
          roomName
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateQueue(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;
      const { name, maxQueueSize, maxWaitTimeSec, holdMusicUrl, announcePosition } = req.body;

      const updated = await (prisma as any).callQueue.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(maxQueueSize !== undefined && { maxQueueSize: Number(maxQueueSize) }),
          ...(maxWaitTimeSec !== undefined && { maxWaitTimeSec: Number(maxWaitTimeSec) }),
          ...(holdMusicUrl !== undefined && { holdMusicUrl: holdMusicUrl || null }),
          ...(announcePosition !== undefined && { announcePosition: Boolean(announcePosition) })
        }
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteQueue(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;

      const queue = await (prisma as any).callQueue.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) }
      });
      if (!queue) return res.status(404).json({ error: 'Queue not found' });

      await (prisma as any).callQueue.delete({
        where: { id }
      });

      return res.json({ success: true, message: 'Call queue deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async simulateQueueCaller(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { id } = req.params;
      const { callerPhone = '+919876543210', callerName = 'Test Simulated Caller' } = req.body;

      const queue = await (prisma as any).callQueue.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) }
      });
      if (!queue) return res.status(404).json({ error: 'Queue not found' });

      const mockSessionId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const result = await CallQueueService.enqueueCaller(companyId, id, mockSessionId, callerPhone, callerName);

      return res.json({
        success: true,
        message: 'Simulated caller added to queue',
        data: {
          queueId: id,
          callSessionId: mockSessionId,
          callerPhone,
          callerName,
          ...result
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Campaigns & Call Execution ───────────────────────────────────────────
  async listCampaigns(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const campaigns = await prisma.callCampaign.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: { voiceAgent: { select: { name: true } } }
      });
      return res.json({ success: true, data: campaigns });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getCampaignDetails(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const campaign = await (prisma as any).callCampaign.findFirst({
        where: { id, companyId },
        include: {
          voiceAgent: { select: { id: true, name: true, role: true } },
          calls: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              recipientPhone: true,
              recipientName: true,
              status: true,
              durationSeconds: true,
              callOutcome: true,
              sentiment: true,
              createdAt: true
            }
          }
        }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      return res.json({ success: true, data: campaign });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createCampaign(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      const { name, voiceAgentId, phoneNumberId, contactList, maxConcurrent, callsPerSecond, retryCount } = req.body;

      if (!name || !voiceAgentId || !contactList || !Array.isArray(contactList) || contactList.length === 0) {
        return res.status(400).json({ error: 'Name, voiceAgentId, and non-empty contactList are required' });
      }

      const campaign = await (prisma as any).callCampaign.create({
        data: {
          companyId,
          name,
          voiceAgentId,
          phoneNumberId: phoneNumberId || null,
          contactList,
          maxConcurrent: maxConcurrent || 5,
          callsPerSecond: callsPerSecond || 1.0,
          retryCount: retryCount || 2,
          totalRecipients: contactList.length,
          status: 'draft'
        }
      });

      return res.status(201).json({ success: true, data: campaign });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async launchSingleCall(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { voiceAgentId, phoneNumberId, recipientPhone, recipientName } = req.body;

      if (!voiceAgentId || !recipientPhone) {
        return res.status(400).json({ error: 'Agent ID and Recipient Phone are required' });
      }

      // Pre-Call Financial Guardrail: Verify minimum prepaid balance (₹200.00 hard lock)
      const credit = await VoiceBillingService.validateCredit(companyId, 200.0);
      if (!credit.allowed) {
        return res.status(402).json({
          error: 'INSUFFICIENT_WALLET_BALANCE',
          balance: credit.balance,
          minRequired: 200.0,
          recommended: 1000.0,
          message: credit.message || `Voiceforce is locked. A minimum wallet balance of ₹200.00 is required (Current balance: ₹${credit.balance.toFixed(2)}). Please top up ₹1,000.00 to resume calling.`
        });
      }

      // Dynamically resolve outbound caller ID from DB without relying on .env
      let effectiveCallerIdNumber: string | null = null;
      let effectivePhoneNumberId: string | null = phoneNumberId || null;

      if (effectivePhoneNumberId) {
        const phone = await (prisma as any).phoneNumber.findFirst({
          where: { id: effectivePhoneNumberId, ...(companyId ? { companyId } : {}) }
        });
        if (phone) effectiveCallerIdNumber = phone.e164Number;
      }

      // If not passed explicitly, check if the agent has an assigned phone number
      if (!effectiveCallerIdNumber && voiceAgentId) {
        const agentPhone = await (prisma as any).phoneNumber.findFirst({
          where: { assignedAgentId: voiceAgentId, status: 'active', ...(companyId ? { companyId } : {}) }
        });
        if (agentPhone) {
          effectiveCallerIdNumber = agentPhone.e164Number;
          effectivePhoneNumberId = agentPhone.id;
        }
      }

      // If still not set, look up the company's active default phone number
      if (!effectiveCallerIdNumber && companyId) {
        const defaultPhone = await (prisma as any).phoneNumber.findFirst({
          where: { companyId, status: 'active' }
        });
        if (defaultPhone) {
          effectiveCallerIdNumber = defaultPhone.e164Number;
          effectivePhoneNumberId = defaultPhone.id;
        }
      }

      const session = await (prisma as any).callSession.create({
        data: {
          companyId,
          voiceAgentId,
          phoneNumberId: effectivePhoneNumberId,
          recipientPhone,
          recipientName: recipientName || null,
          direction: 'outbound',
          status: 'queued',
          structuredData: {
            callerIdNumber: effectiveCallerIdNumber
          }
        }
      });

      // Enqueue call dispatch job to BullMQ queue
      await voiceforceQueue.add('dispatch-call', {
        callSessionId: session.id,
        companyId,
        maxConcurrent: 5
      });

      return res.json({ success: true, data: session });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getRateEstimate(req: any, res: Response) {
    try {
      const phone = (req.query.phone as string) || '';
      const companyId = req.companyId || req.user?.companyId;
      let currency = 'USD';
      if (companyId) {
        const co = await (prisma as any).company.findUnique({
          where: { id: companyId },
          select: { currency: true, currencySymbol: true }
        });
        if (co?.currency) currency = co.currency;
      }
      const { DynamicRateService } = await import('@workspace/voiceforce');
      const rateCard = DynamicRateService.calculateRateForNumber(phone, currency);
      return res.json({ success: true, data: rateCard });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async listCalls(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { status, agentId, search, outcome, sentiment, limit = '50', page = '1' } = req.query;

      const whereClause: any = { companyId };
      if (status && status !== 'all') whereClause.status = status;
      if (agentId) whereClause.voiceAgentId = agentId;
      if (outcome && outcome !== 'all') whereClause.callOutcome = outcome;
      if (sentiment && sentiment !== 'all') whereClause.sentiment = sentiment;

      if (search) {
        whereClause.OR = [
          { recipientPhone: { contains: String(search) } },
          { recipientName: { contains: String(search), mode: 'insensitive' } }
        ];
      }

      const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const skip = (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

      const [calls, total, company] = await Promise.all([
        (prisma as any).callSession.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
          include: {
            voiceAgent: { select: { id: true, name: true } },
            phoneNumber: { select: { id: true, e164Number: true } }
          }
        }),
        (prisma as any).callSession.count({ where: whereClause }),
        companyId ? (prisma as any).company.findUnique({
          where: { id: companyId },
          select: { currency: true, currencySymbol: true }
        }) : null
      ]);

      const formattedCalls = calls.map((c: any) => ({
        ...c,
        companyCurrency: company?.currency || 'USD',
        companyCurrencySymbol: company?.currencySymbol || '$'
      }));

      return res.json({
        success: true,
        data: formattedCalls,
        pagination: { total, page: parseInt(String(page), 10) || 1, limit: take, totalPages: Math.ceil(total / take) }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getCallDetails(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const [call, company] = await Promise.all([
        (prisma as any).callSession.findFirst({
          where: { id, companyId },
          include: {
            voiceAgent: true,
            phoneNumber: true,
            transcripts: { orderBy: { startTimeMs: 'asc' } },
            toolExecutions: { orderBy: { createdAt: 'asc' } }
          }
        }),
        (prisma as any).company.findUnique({
          where: { id: companyId },
          select: { currency: true, currencySymbol: true, country: true }
        })
      ]);

      if (!call) return res.status(404).json({ error: 'Call session not found' });
      return res.json({
        success: true,
        data: {
          ...call,
          companyCurrency: company?.currency || 'USD',
          companyCurrencySymbol: company?.currencySymbol || '$'
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteCall(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const call = await (prisma as any).callSession.findFirst({
        where: { id, companyId }
      });
      if (!call) return res.status(404).json({ error: 'Call session not found' });

      // Clean up child transcripts, tool executions, escalation events, and audit logs
      await (prisma as any).callTranscriptSegment.deleteMany({ where: { callSessionId: id } }).catch(() => {});
      await (prisma as any).callToolExecution.deleteMany({ where: { callSessionId: id } }).catch(() => {});
      await (prisma as any).callEscalationEvent.deleteMany({ where: { callSessionId: id } }).catch(() => {});
      await (prisma as any).actionAuditLog.deleteMany({ where: { callSessionId: id } }).catch(() => {});
      await (prisma as any).voiceWalletTransaction.updateMany({
        where: { callSessionId: id },
        data: { callSessionId: null }
      }).catch(() => {});
      await (prisma as any).callSession.delete({ where: { id } });

      return res.json({ success: true, message: 'Call session permanently deleted.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Do-Not-Call (DNC) Compliance Registry ────────────────────────────────
  async listDnc(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const dncList = await (prisma as any).dncRegistry.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: dncList });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async addDnc(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { phoneNumber, reason } = req.body;
      if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber is required' });

      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      const record = await (prisma as any).dncRegistry.upsert({
        where: {
          companyId_phoneNumber: { companyId, phoneNumber: cleanPhone }
        },
        update: { reason: reason || 'Manual opt-out' },
        create: {
          companyId,
          phoneNumber: cleanPhone,
          reason: reason || 'Manual opt-out'
        }
      });
      return res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async removeDnc(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      await (prisma as any).dncRegistry.deleteMany({
        where: { id, companyId }
      });
      return res.json({ success: true, message: 'Phone number removed from Do-Not-Call registry' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Browser Softphone WebRTC Tester (₹0 Telecom Cost) ────────────────────
  async generateSoftphoneToken(req: any, res: Response) {
    try {
      let companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        const firstCo = await (prisma as any).company.findFirst({ select: { id: true } });
        companyId = firstCo?.id || '';
      }
      const { voiceAgentId } = req.body;

      // Find specified agent or default to first active agent
      let agent = null;
      if (voiceAgentId) {
        agent = await (prisma as any).voiceAgent.findFirst({
          where: { id: voiceAgentId, ...(companyId ? { companyId } : {}) }
        });
      }
      if (!agent && companyId) {
        agent = await (prisma as any).voiceAgent.findFirst({
          where: { companyId, isActive: true }
        });
      }
      if (!agent) {
        agent = await (prisma as any).voiceAgent.findFirst({
          where: { isActive: true }
        });
      }

      if (!agent) {
        return res.status(404).json({ error: 'No active AI Voice Employee found. Please create one first.' });
      }

      const randomSuffix = Math.random().toString(36).substring(7);
      const roomName = `softphone_${Date.now()}_${randomSuffix}`;
      const participantIdentity = `tester_${req.user?.id || 'guest'}_${randomSuffix}`;

      // Create tracking session for in-browser test call
      const session = await (prisma as any).callSession.create({
        data: {
          companyId,
          voiceAgentId: agent.id,
          recipientPhone: 'Browser Microphone',
          recipientName: req.user?.name || 'In-Browser Tester',
          direction: 'inbound',
          status: 'in_progress',
          livekitRoomName: roomName,
          startedAt: new Date()
        }
      });

      // Generate signed JWT token
      const { token, url } = await livekitTokenService.generateToken({
        roomName,
        participantIdentity,
        participantName: req.user?.name || 'Tester',
        metadata: { callSessionId: session.id, isSoftphone: true }
      });

      // Spin up LiveKitRoomWorker in background to bridge AI agent to this room
      const roomWorker = new LiveKitRoomWorker({
        callSessionId: session.id,
        roomName,
        companyId,
        voiceAgentId: agent.id,
        isOutbound: false
      });

      roomWorker.start().catch((workerErr: any) => {
        console.error('[Softphone RoomWorker Start Error]:', workerErr.message);
      });

      // Synthesize high-fidelity Cartesia neural audio for initial agent greeting
      let greetingAudioBase64: string | null = null;
      const firstMessage = agent.firstMessage || 'Hello! I am Maya, your AI employee. How can I assist your business right now?';
      const cartesiaKey = process.env.CARTESIA_API_KEY;
      if (cartesiaKey) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agent?.voiceId || '');
          const voiceId = isUuid ? agent.voiceId : 'a0e99841-438c-4a64-b679-ae501e7d6091';
          const ttsRes = await axios.post(
            'https://api.cartesia.ai/tts/bytes',
            {
              model_id: 'sonic-3.6',
              transcript: firstMessage,
              voice: { mode: 'id', id: voiceId },
              output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 }
            },
            {
              headers: {
                'X-API-Key': cartesiaKey,
                'Cartesia-Version': '2024-06-10',
                'Content-Type': 'application/json'
              },
              responseType: 'arraybuffer',
              timeout: 3500
            }
          );
          if (ttsRes.data) {
            greetingAudioBase64 = `data:audio/wav;base64,${Buffer.from(ttsRes.data).toString('base64')}`;
          }
        } catch (ttsErr: any) {
          console.warn('[Cartesia Greeting Warn]:', ttsErr.message);
        }
      }

      return res.json({
        success: true,
        data: {
          token,
          url,
          roomName,
          callSessionId: session.id,
          agent: {
            id: agent.id,
            name: agent.name,
            role: agent.role,
            firstMessage: agent.firstMessage,
            greetingAudioBase64
          }
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async processSoftphoneTurn(req: any, res: Response) {
    try {
      const callSessionId = req.body?.callSessionId || req.params?.id;
      const { voiceAgentId, userInput } = req.body;

      if (!userInput || !userInput.trim()) {
        return res.status(400).json({ error: 'User input text is required' });
      }

      // 1. Resolve Call Session if provided
      const session = callSessionId ? await prisma.callSession.findUnique({
        where: { id: callSessionId },
        include: { voiceAgent: true }
      }).catch(() => null) : null;

      // Safely resolve Company ID with resilient fallback
      let effectiveCompanyId = req.companyId || req.user?.companyId || session?.companyId;
      if (!effectiveCompanyId) {
        const firstCo = await prisma.company.findFirst({ select: { id: true } });
        effectiveCompanyId = firstCo?.id || '';
      }

      // 2. Resolve Agent
      const agentId = voiceAgentId || session?.voiceAgentId;
      let agent = null;
      if (agentId) {
        agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } }).catch(() => null);
      }
      if (!agent && effectiveCompanyId) {
        agent = await prisma.voiceAgent.findFirst({ where: { companyId: effectiveCompanyId, isActive: true } }).catch(() => null);
      }
      if (!agent) {
        agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } }).catch(() => null);
      }

      // 3. Compile System Prompt with Business Brain safely
      let systemPrompt = '';
      try {
        if (effectiveCompanyId) {
          systemPrompt = await BusinessBrainService.compileSystemPrompt(
            agent?.id || '',
            effectiveCompanyId,
            session?.recipientPhone || 'Browser Microphone'
          );
        }
      } catch (bbErr: any) {
        console.warn('[Softphone Brain Warn]:', bbErr.message);
      }
      if (!systemPrompt) {
        systemPrompt = agent?.prompt || `You are ${agent?.name || 'Maya'}, an intelligent AI Voice employee. Respond naturally and concisely in 1 to 2 friendly spoken sentences. Confirm you speak both English and Hindi if asked.`;
      }

      // 4. Fetch recent transcript context for this session
      const recentTranscripts = session ? await prisma.callTranscriptSegment.findMany({
        where: { callSessionId: session.id },
        orderBy: { startTimeMs: 'asc' },
        take: 8
      }).catch(() => []) : [];

      // Save user transcript segment asynchronously (detached from audio latency path)
      if (session) {
        const elapsed = session.startedAt ? (Date.now() - new Date(session.startedAt).getTime()) : 1000;
        prisma.callTranscriptSegment.create({
          data: {
            callSessionId: session.id,
            speaker: 'user',
            text: userInput.trim(),
            startTimeMs: Math.max(0, elapsed - 1500),
            endTimeMs: elapsed,
            interrupted: false
          }
        }).catch(() => { });
      }

      // 5. Construct conversation history for LLM
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `${systemPrompt}\n\nVOICE CONVERSATION GUIDELINES:\n- You are in a real-time live phone call.\n- Respond in 1 to 2 concise, friendly spoken sentences (under 30 words).\n- If the user asks about language (e.g. English or Hindi), warmly confirm you speak both English and Hindi and can assist in either language.\n- Never output markdown formatting, asterisks, bold text, bullet points, or URLs because your output is spoken directly over audio.`
        }
      ];

      for (const t of recentTranscripts) {
        messages.push({
          role: t.speaker === 'agent' ? 'assistant' : 'user',
          content: t.text
        });
      }

      messages.push({
        role: 'user',
        content: userInput.trim()
      });

      // 6. Generate Response via Company AI (enforcing gpt-4o-mini for sub-400ms speed)
      let agentReply = '';
      try {
        const { settings } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);
        const aiProvider = AIProviderService.getInstance();
        const client = await aiProvider.getClient(settings);

        if (client) {
          const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';
          agentReply = await client.generate(prompt, {
            model: 'gpt-4o-mini',
            max_tokens: 60,
            temperature: 0.5
          });
        }
      } catch (llmErr: any) {
        console.warn('[Softphone LLM Warn]:', llmErr.message);
      }

      if (!agentReply || !agentReply.trim()) {
        agentReply = `I understand. I can assist you in English or Hindi. How may I help you right now?`;
      }

      // Clean up any stray markdown, asterisks, or quotes
      agentReply = agentReply.replace(/[*_#`]/g, '').trim();

      // Save agent transcript segment asynchronously
      if (session) {
        const elapsed = session.startedAt ? (Date.now() - new Date(session.startedAt).getTime()) : 2000;
        prisma.callTranscriptSegment.create({
          data: {
            callSessionId: session.id,
            speaker: 'agent',
            text: agentReply,
            startTimeMs: elapsed,
            endTimeMs: elapsed + 1500,
            interrupted: false
          }
        }).catch(() => { });
      }

      // 7. Synthesize Neural Audio via Cartesia (sonic-3.6 with 2026-08-14 API)
      let audioBase64: string | null = null;
      const cartesiaKey = process.env.CARTESIA_API_KEY;
      if (cartesiaKey) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agent?.voiceId || '');
          const voiceId = isUuid ? agent.voiceId : 'a0e99841-438c-4a64-b679-ae501e7d6091';
          const ttsRes = await axios.post(
            'https://api.cartesia.ai/tts/bytes',
            {
              model_id: 'sonic-3.6',
              transcript: agentReply,
              voice: { mode: 'id', id: voiceId },
              output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 }
            },
            {
              headers: {
                'X-API-Key': cartesiaKey,
                'Cartesia-Version': '2026-08-14',
                'Content-Type': 'application/json'
              },
              responseType: 'arraybuffer',
              timeout: 4000
            }
          );
          if (ttsRes.data) {
            audioBase64 = `data:audio/wav;base64,${Buffer.from(ttsRes.data).toString('base64')}`;
          }
        } catch (ttsErr: any) {
          console.warn('[Cartesia TTS Warn]:', ttsErr.message);
        }
      }

      return res.json({
        success: true,
        data: {
          agentReply,
          audioBase64,
          executedTool: null
        }
      });
    } catch (err: any) {
      console.error('[Softphone Turn Error]:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Ultra-Low Latency SSE Streaming Turn Exchange (Sub-350ms TTFA) ─────────────
  async processSoftphoneTurnStream(req: any, res: Response) {
    try {
      const callSessionId = req.body?.callSessionId || req.params?.id;
      const { voiceAgentId, userInput } = req.body;

      if (!userInput || !userInput.trim()) {
        return res.status(400).json({ error: 'User input text is required' });
      }

      // Initialize SSE stream headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }

      let effectiveCompanyId = req.companyId || req.user?.companyId;
      const session = callSessionId ? await prisma.callSession.findUnique({
        where: { id: callSessionId },
        include: { voiceAgent: true }
      }).catch(() => null) : null;

      if (!effectiveCompanyId) effectiveCompanyId = session?.companyId;
      if (!effectiveCompanyId) {
        const firstCo = await prisma.company.findFirst({ select: { id: true } });
        effectiveCompanyId = firstCo?.id || '';
      }

      const agentId = voiceAgentId || session?.voiceAgentId;
      let agent = null;
      if (agentId) {
        agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } }).catch(() => null);
      }
      if (!agent && effectiveCompanyId) {
        agent = await prisma.voiceAgent.findFirst({ where: { companyId: effectiveCompanyId, isActive: true } }).catch(() => null);
      }
      if (!agent) {
        agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } }).catch(() => null);
      }

      // Asynchronously log user transcript segment (detached from audio response path)
      if (session) {
        const elapsed = session.startedAt ? (Date.now() - new Date(session.startedAt).getTime()) : 1000;
        prisma.callTranscriptSegment.create({
          data: {
            callSessionId: session.id,
            speaker: 'user',
            text: userInput.trim(),
            startTimeMs: Math.max(0, elapsed - 1500),
            endTimeMs: elapsed,
            interrupted: false
          }
        }).catch(() => { });
      }

      // Compile System Prompt with Business Brain
      let systemPrompt = '';
      try {
        if (effectiveCompanyId) {
          systemPrompt = await BusinessBrainService.compileSystemPrompt(
            agent?.id || '',
            effectiveCompanyId,
            session?.recipientPhone || 'Browser Microphone'
          );
        }
      } catch {}
      if (!systemPrompt) {
        systemPrompt = agent?.prompt || `You are ${agent?.name || 'Maya'}, an intelligent AI Voice employee. Respond naturally and concisely in 1 to 2 friendly spoken sentences. Confirm you speak both English and Hindi if asked.`;
      }

      const recentTranscripts = session ? await prisma.callTranscriptSegment.findMany({
        where: { callSessionId: session.id },
        orderBy: { startTimeMs: 'asc' },
        take: 6
      }).catch(() => []) : [];

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `${systemPrompt}\n\nVOICE CONVERSATION GUIDELINES:\n- You are in a real-time live phone call.\n- Respond in 1 to 2 concise, friendly spoken sentences (under 30 words).\n- If the user asks about language (e.g. English or Hindi), warmly confirm you speak both English and Hindi and can assist in either language.\n- Never output markdown formatting, asterisks, bold text, bullet points, or URLs because your output is spoken directly over audio.`
        }
      ];

      for (const t of recentTranscripts) {
        messages.push({
          role: t.speaker === 'agent' ? 'assistant' : 'user',
          content: t.text
        });
      }
      messages.push({ role: 'user', content: userInput.trim() });

      const cartesiaKey = process.env.CARTESIA_API_KEY;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agent?.voiceId || '');
      const voiceId = isUuid ? agent.voiceId : 'a0e99841-438c-4a64-b679-ae501e7d6091';

      // Helper function to synthesize an individual sentence chunk in sub-60ms
      const synthesizeSentence = async (sentenceText: string): Promise<string | null> => {
        if (!cartesiaKey || !sentenceText.trim()) return null;
        try {
          const ttsRes = await axios.post(
            'https://api.cartesia.ai/tts/bytes',
            {
              model_id: 'sonic-3.6',
              transcript: sentenceText.replace(/[*_#`]/g, '').trim(),
              voice: { mode: 'id', id: voiceId },
              output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 }
            },
            {
              headers: {
                'X-API-Key': cartesiaKey,
                'Cartesia-Version': '2026-08-14',
                'Content-Type': 'application/json'
              },
              responseType: 'arraybuffer',
              timeout: 3000
            }
          );
          if (ttsRes.data) {
            return `data:audio/wav;base64,${Buffer.from(ttsRes.data).toString('base64')}`;
          }
        } catch (err: any) {
          console.warn('[Cartesia Stream Chunk TTS Warn]:', err.message);
        }
        return null;
      };

      const sentenceStreamer = new SentenceStreamer({ minWordsPerChunk: 3, maxWordsPerChunk: 18 });
      let fullAssistantReply = '';

      try {
        const { settings } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);
        const aiProvider = AIProviderService.getInstance();
        const client = await aiProvider.getClient(settings);

        if (client) {
          const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';
          await client.generateStream(prompt, { model: 'gpt-4o-mini', max_tokens: 70, temperature: 0.5 }, async (chunk: string) => {
            fullAssistantReply += chunk;
            const completedSentences = sentenceStreamer.push(chunk);
            for (const s of completedSentences) {
              const audioBase64 = await synthesizeSentence(s);
              res.write(`data: ${JSON.stringify({ type: 'sentence', text: s, audioBase64 })}\n\n`);
            }
          });
        }
      } catch (streamErr: any) {
        console.warn('[Stream LLM Error]:', streamErr.message);
      }

      // Flush remaining sentence buffer
      const finalSentences = sentenceStreamer.flush();
      for (const s of finalSentences) {
        const audioBase64 = await synthesizeSentence(s);
        res.write(`data: ${JSON.stringify({ type: 'sentence', text: s, audioBase64 })}\n\n`);
      }

      if (!fullAssistantReply.trim()) {
        const fallback = "I understand. I can assist you in English or Hindi. How may I help you right now?";
        const audioBase64 = await synthesizeSentence(fallback);
        res.write(`data: ${JSON.stringify({ type: 'sentence', text: fallback, audioBase64 })}\n\n`);
        fullAssistantReply = fallback;
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullAssistantReply.replace(/[*_#`]/g, '').trim() })}\n\n`);
      res.end();

      // Asynchronously log agent transcript segment
      if (session) {
        const elapsed = session.startedAt ? (Date.now() - new Date(session.startedAt).getTime()) : 2000;
        prisma.callTranscriptSegment.create({
          data: {
            callSessionId: session.id,
            speaker: 'agent',
            text: fullAssistantReply.replace(/[*_#`]/g, '').trim(),
            startTimeMs: elapsed,
            endTimeMs: elapsed + 1500,
            interrupted: false
          }
        }).catch(() => { });
      }
    } catch (err: any) {
      console.error('[Softphone Turn Stream Error]:', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: err.message });
      }
      res.end();
    }
  },

  async endSoftphoneCall(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const { durationSeconds } = req.body;

      const session = await (prisma as any).callSession.findFirst({
        where: { id, companyId }
      });

      if (!session) {
        return res.status(404).json({ error: 'Call session not found' });
      }

      const dur = Number(durationSeconds) || Math.round((Date.now() - new Date(session.startedAt || session.createdAt).getTime()) / 1000);

      await (prisma as any).callSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          endedAt: new Date(),
          durationSeconds: dur
        }
      });

      // Enqueue post-call analysis in BullMQ
      try {
        await voiceforceQueue.add('process-post-call', {
          callSessionId: session.id,
          companyId
        });
      } catch { }

      return res.json({ success: true, message: 'Softphone call ended and queued for post-call analysis' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Campaign Batch Launch & Controls ─────────────────────────────────────
  async launchCampaign(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      // Hard lock: Minimum wallet balance check before campaign launch (₹200.00)
      const credit = await VoiceBillingService.validateCredit(companyId, 200.0);
      if (!credit.allowed) {
        return res.status(402).json({
          error: 'INSUFFICIENT_WALLET_BALANCE',
          balance: credit.balance,
          minRequired: 200.0,
          recommended: 1000.0,
          message: credit.message || `Voiceforce is locked. A minimum wallet balance of ₹200.00 is required to launch an outbound campaign (Current balance: ₹${credit.balance.toFixed(2)}). Please top up ₹1,000.00.`
        });
      }

      const campaign = await (prisma as any).callCampaign.findFirst({
        where: { id, companyId },
        include: { voiceAgent: true, phoneNumber: true }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const contacts = Array.isArray(campaign.contactList) ? campaign.contactList : [];

      await (prisma as any).callCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'running',
          totalRecipients: contacts.length
        }
      });

      // Dynamically resolve outbound caller ID for campaign from DB without relying on .env
      let campaignCallerId: string | null = null;
      let campaignPhoneId: string | null = campaign.phoneNumberId || null;

      if (campaignPhoneId) {
        const phone = await (prisma as any).phoneNumber.findFirst({
          where: { id: campaignPhoneId, ...(companyId ? { companyId } : {}) }
        });
        if (phone) campaignCallerId = phone.e164Number;
      }

      if (!campaignCallerId && campaign.voiceAgentId) {
        const agentPhone = await (prisma as any).phoneNumber.findFirst({
          where: { assignedAgentId: campaign.voiceAgentId, status: 'active', ...(companyId ? { companyId } : {}) }
        });
        if (agentPhone) {
          campaignCallerId = agentPhone.e164Number;
          campaignPhoneId = agentPhone.id;
        }
      }

      if (!campaignCallerId && companyId) {
        const defaultPhone = await (prisma as any).phoneNumber.findFirst({
          where: { companyId, status: 'active' }
        });
        if (defaultPhone) {
          campaignCallerId = defaultPhone.e164Number;
          campaignPhoneId = defaultPhone.id;
        }
      }

      // Dispatch contacts as queued call sessions and push to BullMQ queue with pacing
      let queuedCount = 0;
      const cpsThrottleMs = Math.round(1000 / (campaign.callsPerSecond || 1.0));

      for (let idx = 0; idx < contacts.length; idx++) {
        const contact = contacts[idx] as any;
        if (!contact.phone) continue;

        const session = await (prisma as any).callSession.create({
          data: {
            companyId,
            campaignId: campaign.id,
            voiceAgentId: campaign.voiceAgentId,
            phoneNumberId: campaignPhoneId,
            recipientPhone: contact.phone,
            recipientName: contact.name || null,
            direction: 'outbound',
            status: 'queued',
            structuredData: {
              callerIdNumber: campaignCallerId
            }
          }
        });

        // Enqueue to BullMQ worker with staggered delay for Calls-Per-Second (CPS) compliance
        try {
          await voiceforceQueue.add('dispatch-call', {
            callSessionId: session.id,
            companyId,
            maxConcurrent: campaign.maxConcurrent || 5
          }, {
            delay: idx * cpsThrottleMs,
            attempts: campaign.retryCount || 2
          });
        } catch (queueErr: any) {
          console.warn(`[BullMQ Campaign Dispatch]: Failed to enqueue job for session ${session.id}:`, queueErr.message);
        }

        queuedCount++;
      }

      return res.json({
        success: true,
        message: `Campaign launched with ${queuedCount} contacts queued into BullMQ engine.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async pauseCampaign(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const campaign = await (prisma as any).callCampaign.update({
        where: { id },
        data: { status: 'paused' }
      });

      return res.json({ success: true, message: 'Campaign paused', data: campaign });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async resumeCampaign(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const campaign = await (prisma as any).callCampaign.update({
        where: { id },
        data: { status: 'running' }
      });

      return res.json({ success: true, message: 'Campaign resumed', data: campaign });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async stopCampaign(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      const campaign = await (prisma as any).callCampaign.update({
        where: { id },
        data: { status: 'completed' }
      });

      return res.json({ success: true, message: 'Campaign stopped', data: campaign });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Voice Wallet Management ──────────────────────────────────────────────
  async getWallet(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const wallet = await VoiceBillingService.getWalletDetails(companyId);
      return res.json({ success: true, data: wallet });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async rechargeWallet(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { amountInr, paymentRef } = req.body;

      if (!amountInr || Number(amountInr) <= 0) {
        return res.status(400).json({ error: 'Valid recharge amount is required' });
      }

      const result = await VoiceBillingService.rechargeWallet(
        companyId,
        Number(amountInr),
        paymentRef || 'Manual Test Recharge'
      );

      return res.json({
        success: true,
        message: `Wallet successfully recharged with ₹${Number(amountInr).toFixed(2)}`,
        data: result
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createWalletOrder(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      const { amountInr } = req.body;
      const order = await VoiceBillingService.createRazorpayOrder(companyId, Number(amountInr));
      return res.json({ success: true, data: order });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async verifyWalletPayment(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      const { orderId, paymentId, signature, amountInr } = req.body;
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ error: 'orderId, paymentId, and signature are required' });
      }
      const result = await VoiceBillingService.verifyAndCreditPayment(
        companyId,
        orderId,
        paymentId,
        signature,
        Number(amountInr) || undefined
      );
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  },

  async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await VoiceBillingService.verifyWebhookAndCredit(rawBody, signature || '');
      return res.json({ success: true, handled: result.handled });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  },

  async updateAutoRecharge(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      const { voiceAutoRecharge, voiceThresholdInr, voiceRechargeAmountInr } = req.body;

      const wallet = await WalletService.updateSettings(companyId, {
        autoRecharge: voiceAutoRecharge !== undefined ? Boolean(voiceAutoRecharge) : undefined,
        thresholdInr: voiceThresholdInr !== undefined ? Number(voiceThresholdInr) : undefined,
        rechargeAmountInr: voiceRechargeAmountInr !== undefined ? Number(voiceRechargeAmountInr) : undefined
      });

      return res.json({
        success: true,
        data: {
          voiceBalanceInr: wallet.balanceInr,
          voiceAutoRecharge: wallet.autoRecharge,
          voiceThresholdInr: wallet.thresholdInr,
          voiceRechargeAmountInr: wallet.rechargeAmountInr
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },



  // ─── Superadmin Voice Platform Operations ──────────────────────────────────
  async getSuperadminOverview(req: any, res: Response) {
    try {
      const [
        totalSessions,
        liveSessions,
        completedSessions,
        failedSessions,
        totalCompanies,
        totalAgents,
        totalCampaigns,
        tenants
      ] = await Promise.all([
        (prisma as any).callSession.count(),
        (prisma as any).callSession.count({ where: { status: { in: ['in_progress', 'dialing', 'ringing'] } } }),
        (prisma as any).callSession.count({ where: { status: 'completed' } }),
        (prisma as any).callSession.count({ where: { status: 'failed' } }),
        (prisma as any).company.count(),
        (prisma as any).voiceAgent.count(),
        (prisma as any).callCampaign.count(),
        (prisma as any).company.findMany({
          select: {
            id: true,
            name: true,
            voiceBalanceInr: true,
            _count: {
              select: {
                callSessions: true,
                voiceAgents: true,
                callCampaigns: true
              }
            }
          },
          take: 20,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const providers = [
        { name: 'LiveKit SFU Gateway', type: 'webrtc', status: 'healthy', latencyMs: 18, port: 7880 },
        { name: 'Telnyx SIP Trunk (PSTN)', type: 'sip', status: 'healthy', latencyMs: 34, port: 5060 },
        { name: 'Cartesia Ink-2 (STT)', type: 'speech-to-text', status: 'operational', latencyMs: 78, endpoint: 'wss://api.cartesia.ai/stt' },
        { name: 'Cartesia Sonic (TTS)', type: 'text-to-speech', status: 'operational', latencyMs: 85, endpoint: 'wss://api.cartesia.ai' },
        { name: 'Workspace AI (OpenAI/Gemini)', type: 'inference', status: 'operational', latencyMs: 120, fallback: 'Dynamic Multi-LLM' }
      ];

      return res.json({
        success: true,
        data: {
          metrics: {
            totalSessions,
            liveSessions,
            completedSessions,
            failedSessions,
            totalCompanies,
            totalAgents,
            totalCampaigns,
            blendedCogsPerMinInr: 1.28,
            retailRatePerMinInr: 2.50,
            grossMarginPercent: 48.8
          },
          providers,
          tenants
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async superadminKillswitch(req: any, res: Response) {
    try {
      const { action, companyId } = req.body;
      if (action === 'halt_all_campaigns') {
        await (prisma as any).callCampaign.updateMany({
          where: { status: 'running' },
          data: { status: 'paused' }
        });
        return res.json({ success: true, message: 'All active campaigns globally halted.' });
      }

      if (action === 'suspend_tenant' && companyId) {
        await (prisma as any).callCampaign.updateMany({
          where: { companyId, status: 'running' },
          data: { status: 'paused' }
        });
        await WalletService.manualAdjustment({
          companyId,
          newBalance: 0,
          reason: 'Voiceforce suspended by platform superadmin'
        });
        return res.json({ success: true, message: `Voiceforce suspended for tenant ${companyId}` });
      }

      return res.status(400).json({ error: 'Invalid killswitch action' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Natural Language AI Employee Training ──────────────────────────────
  async parseNaturalLanguageTraining(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const { description } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });
      if (!description?.trim()) return res.status(400).json({ error: 'Description text is required' });

      const result = await NaturalLanguageTrainerService.parseTrainingDescription(
        description,
        companyId,
        id !== 'new' ? id : undefined
      );

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async applyNaturalLanguageTraining(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const userId = req.user?.id;
      const { id } = req.params;
      const { draft } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });
      if (!draft) return res.status(400).json({ error: 'Draft payload is required' });

      const result = await NaturalLanguageTrainerService.commitTrainingDraft(
        companyId,
        id,
        draft,
        userId
      );

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async listAgentVersions(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const versions = await (prisma as any).voiceAgentVersion.findMany({
        where: { companyId, voiceAgentId: id },
        orderBy: { versionNumber: 'desc' },
        take: 20
      });

      return res.json({ success: true, versions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async rollbackAgentVersion(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id, versionNumber } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const version = await (prisma as any).voiceAgentVersion.findUnique({
        where: {
          voiceAgentId_versionNumber: {
            voiceAgentId: id,
            versionNumber: parseInt(versionNumber, 10)
          }
        }
      });

      if (!version) return res.status(404).json({ error: 'Version not found' });

      const snapshot = version.snapshot as any;
      if (snapshot?.previousSystemPrompt) {
        await (prisma as any).voiceAgent.update({
          where: { id },
          data: {
            systemPrompt: snapshot.previousSystemPrompt,
            firstMessage: snapshot.previousFirstMessage || undefined
          }
        });
      }

      return res.json({ success: true, message: `Rolled back to version ${versionNumber}` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Agent Safety Guardrails ─────────────────────────────────────────────
  async getAgentGuardrails(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      let guardrail = await (prisma as any).voiceAgentGuardrail.findUnique({
        where: { voiceAgentId: id }
      });

      if (!guardrail) {
        guardrail = await (prisma as any).voiceAgentGuardrail.create({
          data: {
            companyId,
            voiceAgentId: id,
            maxDiscountPercent: 10.0,
            maxOrderValue: 1000.0,
            minLeadTimeHours: 2,
            forbiddenTopics: [],
            rules: { version: 1, dos: [], donts: [] }
          }
        });
      }

      return res.json({ success: true, guardrail });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateAgentGuardrails(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const { maxDiscountPercent, maxDiscountAmount, maxOrderValue, minLeadTimeHours, maxDeliveryKm, forbiddenTopics, pciRedactionEnabled, rules } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const guardrail = await (prisma as any).voiceAgentGuardrail.upsert({
        where: { voiceAgentId: id },
        create: {
          companyId,
          voiceAgentId: id,
          maxDiscountPercent: Number(maxDiscountPercent ?? 10.0),
          maxDiscountAmount: Number(maxDiscountAmount ?? 50.0),
          maxOrderValue: Number(maxOrderValue ?? 1000.0),
          minLeadTimeHours: Number(minLeadTimeHours ?? 2),
          maxDeliveryKm: maxDeliveryKm ? Number(maxDeliveryKm) : null,
          forbiddenTopics: Array.isArray(forbiddenTopics) ? forbiddenTopics : [],
          pciRedactionEnabled: pciRedactionEnabled ?? true,
          rules: rules !== undefined ? rules : { version: 1, dos: [], donts: [] }
        },
        update: {
          maxDiscountPercent: maxDiscountPercent !== undefined ? Number(maxDiscountPercent) : undefined,
          maxDiscountAmount: maxDiscountAmount !== undefined ? Number(maxDiscountAmount) : undefined,
          maxOrderValue: maxOrderValue !== undefined ? Number(maxOrderValue) : undefined,
          minLeadTimeHours: minLeadTimeHours !== undefined ? Number(minLeadTimeHours) : undefined,
          maxDeliveryKm: maxDeliveryKm !== undefined ? (maxDeliveryKm ? Number(maxDeliveryKm) : null) : undefined,
          forbiddenTopics: Array.isArray(forbiddenTopics) ? forbiddenTopics : undefined,
          pciRedactionEnabled: pciRedactionEnabled !== undefined ? pciRedactionEnabled : undefined,
          rules: rules !== undefined ? rules : undefined
        }
      });

      return res.json({ success: true, guardrail });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Pre-Flight Sandbox Simulator ────────────────────────────────────────
  async listSimulationScenarios(req: any, res: Response) {
    try {
      const scenarios = PreFlightSimulatorService.getBuiltinScenarios();
      return res.json({ success: true, scenarios });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async startSimulation(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { voiceAgentId, scenarioId } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });
      if (!voiceAgentId) return res.status(400).json({ error: 'VoiceAgent ID required' });

      const session = await PreFlightSimulatorService.startSimulationSession(
        companyId,
        voiceAgentId,
        scenarioId,
        req.user?.name || 'Tester'
      );

      return res.json({ success: true, ...session });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Zero-Repeat Warm Human Handoff ──────────────────────────────────────
  async getLiveHandoffContext(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { callSessionId } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const handoff = await WarmHandoffService.prepareHandoff(callSessionId, companyId);
      return res.json({ success: true, ...handoff });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async triggerWarmHandoff(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { callSessionId, targetPhone, targetUserId, reason } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });
      if (!callSessionId) return res.status(400).json({ error: 'CallSession ID required' });

      const handoff = await WarmHandoffService.prepareHandoff(
        callSessionId,
        companyId,
        reason || 'manual_staff_takeover',
        targetPhone,
        targetUserId
      );

      return res.json({ success: true, message: 'Warm handoff initiated', ...handoff });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Executive ROI & Analytics ───────────────────────────────────────────
  async getRoiAnalytics(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { timeframe = '30d', wage = '18.0', appointmentValue = '100.0' } = req.query;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const report = await RoiAnalyticsService.calculateRoi(
        companyId,
        timeframe as any,
        parseFloat(wage as string) || 18.0,
        parseFloat(appointmentValue as string) || 100.0
      );

      return res.json({ success: true, report });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Daily Executive Performance Briefing ────────────────────────────────
  async getLatestDailyBriefing(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      let briefing = await (prisma as any).dailyVoiceBriefing.findFirst({
        where: { companyId },
        orderBy: { briefingDate: 'desc' }
      });

      if (!briefing) {
        briefing = await DailyBriefingService.generateBriefingForCompany(companyId);
      }

      return res.json({ success: true, briefing });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async generateDailyBriefing(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const briefing = await DailyBriefingService.generateBriefingForCompany(companyId);
      return res.json({ success: true, briefing });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async generateAgentBriefing(req: any, res: Response) {
    try {
      const { id } = req.params;
      const agent = await prisma.voiceAgent.findUnique({
        where: { id },
        select: { id: true, companyId: true }
      });
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      const briefing = await DailyBriefingService.generateBriefingForAgent(agent.id, agent.companyId);
      return res.json({ success: true, briefing });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },


  // ─── Industry Vertical Templates ─────────────────────────────────────────
  async listTemplates(req: any, res: Response) {
    try {
      const templates = await (prisma as any).industryTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return res.json({ success: true, templates });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async instantiateTemplate(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { slug } = req.params;
      const { agentName } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const template = await (prisma as any).industryTemplate.findUnique({
        where: { slug }
      });

      if (!template) return res.status(404).json({ error: `Template ${slug} not found` });

      const cfg = template.defaultConfig as any;

      const agent = await (prisma as any).voiceAgent.create({
        data: {
          companyId,
          name: agentName || template.name,
          role: cfg.role || 'Assistant',
          systemPrompt: cfg.systemPrompt || 'You are an autonomous AI employee.',
          firstMessage: cfg.firstMessage || 'Hello! How can I assist you today?',
          voiceProvider: 'cartesia',
          voiceId: '4e045189-a105-4024-921c-dc46b9794f61', // High-fidelity Cartesia Prince voice
          engineType: 'cascaded',
          llmModel: 'llama-3.3-70b-versatile',
          sttModel: 'nova-3',
          enabledToolNames: template.suggestedTools || ['search_knowledge_base', 'create_task', 'create_crm_client']
        }
      });

      // Create guardrail for newly instantiated agent
      await (prisma as any).voiceAgentGuardrail.create({
        data: {
          companyId,
          voiceAgentId: agent.id,
          maxDiscountPercent: cfg.guardrails?.maxDiscountPercent ?? 10.0,
          maxDiscountAmount: cfg.guardrails?.maxDiscountAmount ?? 50.0,
          maxOrderValue: cfg.guardrails?.maxOrderValue ?? 1000.0,
          minLeadTimeHours: cfg.guardrails?.minLeadTimeHours ?? 2,
          pciRedactionEnabled: true,
          rules: cfg.guardrails?.rules || DEFAULT_AGENT_GUARDRAIL_RULES
        }
      }).catch(() => {});

      return res.json({ success: true, agent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Forensic Call Audit Trail ───────────────────────────────────────────
  async getCallAuditTrail(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID required' });

      const logs = await (prisma as any).actionAuditLog.findMany({
        where: {
          callSessionId: id,
          ...(companyId ? { companyId } : {})
        },
        orderBy: { turnIndex: 'asc' }
      });

      return res.json({ success: true, logs });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Universal Enterprise Business Brain & Dedicated RAG Pipeline ────────
  async uploadKnowledgeDocument(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId || req.body?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No document file provided for upload' });

      const filename = file.originalname || 'uploaded-document.txt';
      const mimeType = file.mimetype || 'text/plain';
      const fileSizeBytes = file.size || (file.buffer ? file.buffer.length : 0);

      // 1. Initialize Document Record in DB (Status: Queued / Processing)
      const docRecord = await (prisma as any).companyKnowledgeDoc.create({
        data: {
          companyId,
          filename,
          mimeType,
          fileSizeBytes,
          status: 'processing',
          progressPercent: 10,
          totalChunks: 0
        }
      });

      // 2. Extract Text Content (supports PDF, DOCX, TXT, CSV, JSON, Markdown)
      let extractedText = '';
      const buffer = file.buffer;
      const lowerName = filename.toLowerCase();

      try {
        if (lowerName.endsWith('.pdf')) {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text || '';
        } else if (lowerName.endsWith('.docx')) {
          const mammoth = require('mammoth');
          const docxData = await mammoth.extractRawText({ buffer });
          extractedText = docxData.value || '';
        } else {
          extractedText = buffer.toString('utf-8');
        }
      } catch (parseErr: any) {
        console.warn(`[KnowledgeUpload] Parser fallback for ${filename}:`, parseErr.message);
        extractedText = buffer.toString('utf-8');
      }

      if (!extractedText || !extractedText.trim()) {
        await (prisma as any).companyKnowledgeDoc.update({
          where: { id: docRecord.id },
          data: {
            status: 'error',
            errorMessage: 'Document contains no readable text or failed extraction.'
          }
        });
        return res.status(400).json({ error: 'Failed to extract text from document.' });
      }

      // 3. Chunk Document via Semantic Sliding Window
      const { DocumentChunker, EmbeddingEngine } = await import('@workspace/rag');
      const chunker = new DocumentChunker({ maxWordsPerChunk: 350, overlapWords: 60 });
      const chunks = chunker.chunkText(extractedText, filename);

      if (chunks.length === 0) {
        await (prisma as any).companyKnowledgeDoc.update({
          where: { id: docRecord.id },
          data: {
            status: 'error',
            errorMessage: 'Document resulted in zero valid semantic chunks.'
          }
        });
        return res.status(400).json({ error: 'No text chunks could be generated.' });
      }

      // Update total chunks count & progress
      await (prisma as any).companyKnowledgeDoc.update({
        where: { id: docRecord.id },
        data: {
          totalChunks: chunks.length,
          progressPercent: 25
        }
      });

      // 4. Batch Vectorize and Ingest Chunks with Real-Time Incremental Progress %
      const embeddingEngine = new EmbeddingEngine();
      const BATCH_SIZE = 5;
      let completedChunks = 0;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchTexts = batch.map(c => c.content);
        
        const vectors = await embeddingEngine.generateBatchEmbeddings(batchTexts);

        // Store chunks in database
        for (let j = 0; j < batch.length; j++) {
          const chunkItem = batch[j];
          const vector = vectors[j] || [];

          await (prisma as any).knowledgeChunk.create({
            data: {
              companyId,
              documentId: docRecord.id,
              chunkIndex: chunkItem.chunkIndex,
              content: chunkItem.content,
              embedding: vector,
              metadata: chunkItem.metadata || {}
            }
          });
        }

        completedChunks += batch.length;
        const currentProgress = Math.min(98, 25 + Math.round((completedChunks / chunks.length) * 73));

        await (prisma as any).companyKnowledgeDoc.update({
          where: { id: docRecord.id },
          data: { progressPercent: currentProgress }
        });
      }

      // 5. Finalize: Set Status to Ready (100%)
      const finalDoc = await (prisma as any).companyKnowledgeDoc.update({
        where: { id: docRecord.id },
        data: {
          status: 'ready',
          progressPercent: 100
        }
      });

      return res.json({
        success: true,
        message: `Successfully processed and indexed "${filename}" into ${chunks.length} RAG knowledge chunks.`,
        document: finalDoc
      });
    } catch (err: any) {
      console.error('[VoiceforceController.uploadKnowledgeDocument] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  async listKnowledgeDocuments(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId || req.query?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const documents = await (prisma as any).companyKnowledgeDoc.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { chunks: true }
          }
        }
      });

      return res.json({
        success: true,
        documents: documents.map((d: any) => ({
          id: d.id,
          filename: d.filename,
          fileSizeBytes: d.fileSizeBytes,
          mimeType: d.mimeType,
          status: d.status,
          progressPercent: d.progressPercent,
          totalChunks: d.totalChunks || d._count?.chunks || 0,
          errorMessage: d.errorMessage,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteKnowledgeDocument(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      await (prisma as any).companyKnowledgeDoc.deleteMany({
        where: { id, companyId }
      });

      return res.json({ success: true, message: 'Document and associated vector chunks removed.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async queryKnowledgeBase(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId || req.body?.companyId;
      const { query, topK } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      if (!query || !query.trim()) return res.status(400).json({ error: 'Search query is required' });

      const { HybridSearchService } = await import('@workspace/rag');
      return res.json({
        success: true,
        query,
        count: results.length,
        results
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Voice Agent RAG Vault Linking ─────────────────────────────────────────
  async linkAgentVaults(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const { vaultIds = [] } = req.body;

      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      // Verify agent belongs to company
      const agent = await (prisma as any).voiceAgent.findFirst({
        where: { id, companyId }
      });
      if (!agent) return res.status(404).json({ error: 'Voice Agent not found' });

      // Clear existing links
      await (prisma as any).voiceAgentVaultLink.deleteMany({
        where: { voiceAgentId: id }
      });

      // Insert new links
      if (Array.isArray(vaultIds) && vaultIds.length > 0) {
        for (const vaultId of vaultIds) {
          await (prisma as any).voiceAgentVaultLink.create({
            data: {
              voiceAgentId: id,
              vaultId
            }
          }).catch(() => {});
        }
      }

      return res.json({
        success: true,
        message: `Successfully linked ${vaultIds.length} RAG Memory Vaults to ${agent.name}.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getAgentLinkedVaults(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const links = await (prisma as any).voiceAgentVaultLink.findMany({
        where: { voiceAgentId: id },
        include: {
          vault: {
            select: {
              id: true,
              name: true,
              purposeDescription: true,
              mode: true,
              category: true,
              totalDocuments: true,
              totalChunks: true,
              totalSizeBytes: true,
              status: true
            }
          }
        }
      });

      const linkedVaults = links
        .map((l: any) => l.vault)
        .filter(Boolean)
        .map((v: any) => ({
          ...v,
          totalSizeBytes: Number(v.totalSizeBytes || 0)
        }));

      return res.json({ success: true, linkedVaults });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};


