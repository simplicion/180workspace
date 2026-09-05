import { Request, Response } from 'express';
import { prisma } from '@workspace/db';
import { TelnyxService, LiveKitTokenService, LiveKitRoomWorker, VoiceBillingService } from '@workspace/voiceforce';
import { redis } from '../../../system-configs/config/redis';
import { Queue } from 'bullmq';

const telnyx = new TelnyxService();
const livekitTokenService = new LiveKitTokenService();
const voiceforceQueue = new Queue('voiceforce-queue', { connection: redis });

export const VoiceforceController = {
  // ─── Dashboard Metrics ───────────────────────────────────────────────────
  async getMetrics(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });

      const [totalAgents, totalNumbers, totalCalls, answeredCalls, completedCalls, activeSessions, wallet] = await Promise.all([
        (prisma as any).voiceAgent.count({ where: { companyId } }),
        (prisma as any).phoneNumber.count({ where: { companyId } }),
        (prisma as any).callSession.count({ where: { companyId } }),
        (prisma as any).callSession.count({ where: { companyId, answeredAt: { not: null } } }),
        (prisma as any).callSession.findMany({
          where: { companyId, status: 'completed' },
          select: { durationSeconds: true, estimatedCostInr: true, callOutcome: true }
        }),
        (prisma as any).callSession.findMany({
          where: { companyId, status: { in: ['dialing', 'ringing', 'in_progress'] } },
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: { voiceAgent: { select: { name: true } } }
        }),
        VoiceBillingService.getWalletDetails(companyId)
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
          wallet
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Voice Agents CRUD ────────────────────────────────────────────────────
  async listAgents(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const agents = await prisma.voiceAgent.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: { assignedNumbers: { select: { e164Number: true, friendlyName: true } } }
      });
      return res.json({ success: true, data: agents });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createAgent(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { name, role, systemPrompt, voiceId, language, firstMessage, allowBargeIn, enabledToolNames } = req.body;

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
          enabledToolNames: enabledToolNames || ['search_knowledge_base', 'create_task', 'create_crm_client']
        }
      });

      return res.json({ success: true, data: agent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async updateAgent(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;
      const data = req.body;

      const agent = await prisma.voiceAgent.update({
        where: { id, companyId },
        data
      });

      return res.json({ success: true, data: agent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteAgent(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      await prisma.voiceAgent.delete({ where: { id, companyId } });
      return res.json({ success: true, message: 'Agent deleted' });
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
      const { countryCode = 'US' } = req.query;
      const numbers = await telnyx.searchNumbers(countryCode as string, 5);
      return res.json({ success: true, data: numbers });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async purchaseNumber(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { phoneNumber, friendlyName, assignedAgentId } = req.body;

      const purchaseResult = await telnyx.purchaseNumber(phoneNumber);
      if (!purchaseResult.success) {
        return res.status(400).json({ error: purchaseResult.error });
      }

      const record = await prisma.phoneNumber.create({
        data: {
          companyId,
          e164Number: phoneNumber,
          friendlyName: friendlyName || phoneNumber,
          provider: 'telnyx',
          providerId: purchaseResult.id,
          assignedAgentId: assignedAgentId || null,
          status: 'active'
        }
      });

      return res.json({ success: true, data: record });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async requestCallerIdVerification(req: any, res: Response) {
    try {
      const { phoneNumber } = req.body;
      const result = await telnyx.requestCallerIdVerification(phoneNumber);
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

      const result = await telnyx.submitCallerIdOtp(verificationId, code);
      if (!result.verified) {
        return res.status(400).json({ error: result.error || 'Invalid OTP code' });
      }

      const record = await prisma.phoneNumber.create({
        data: {
          companyId,
          e164Number: phoneNumber,
          friendlyName: friendlyName || 'Verified Business Line',
          provider: 'verified_caller_id',
          providerId: verificationId,
          assignedAgentId: assignedAgentId || null,
          status: 'active'
        }
      });

      return res.json({ success: true, data: record });
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

      // Pre-Call Financial Guardrail: Verify minimum prepaid balance (₹15.00)
      const credit = await VoiceBillingService.validateCredit(companyId, 15.0);
      if (!credit.allowed) {
        return res.status(402).json({
          error: `Insufficient voice balance (₹${credit.balance.toFixed(2)}). Minimum ₹15.00 required. Please recharge your wallet.`
        });
      }

      const session = await (prisma as any).callSession.create({
        data: {
          companyId,
          voiceAgentId,
          phoneNumberId: phoneNumberId || null,
          recipientPhone,
          recipientName: recipientName || null,
          direction: 'outbound',
          status: 'queued'
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

      const [calls, total] = await Promise.all([
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
        (prisma as any).callSession.count({ where: whereClause })
      ]);

      return res.json({ 
        success: true, 
        data: calls, 
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

      const call = await (prisma as any).callSession.findFirst({
        where: { id, companyId },
        include: {
          voiceAgent: true,
          phoneNumber: true,
          transcripts: { orderBy: { startTimeMs: 'asc' } },
          toolExecutions: { orderBy: { createdAt: 'asc' } }
        }
      });

      if (!call) return res.status(404).json({ error: 'Call session not found' });
      return res.json({ success: true, data: call });
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

      // Clean up child transcripts and tool executions
      await (prisma as any).callTranscriptSegment.deleteMany({ where: { callSessionId: id } });
      await (prisma as any).callToolExecution.deleteMany({ where: { callSessionId: id } });
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
      const companyId = req.companyId || req.user?.companyId;
      const { voiceAgentId } = req.body;

      // Find specified agent or default to first active agent
      let agent = null;
      if (voiceAgentId) {
        agent = await (prisma as any).voiceAgent.findFirst({
          where: { id: voiceAgentId, companyId }
        });
      }
      if (!agent) {
        agent = await (prisma as any).voiceAgent.findFirst({
          where: { companyId, isActive: true }
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
            firstMessage: agent.firstMessage
          }
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Campaign Batch Launch & Controls ─────────────────────────────────────
  async launchCampaign(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { id } = req.params;

      // Minimum wallet balance check before campaign launch (₹25.00)
      const credit = await VoiceBillingService.validateCredit(companyId, 25.0);
      if (!credit.allowed) {
        return res.status(402).json({
          error: `Insufficient voice balance (₹${credit.balance.toFixed(2)}). Minimum ₹25.00 required to launch an outbound campaign.`
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
            phoneNumberId: campaign.phoneNumberId,
            recipientPhone: contact.phone,
            recipientName: contact.name || null,
            direction: 'outbound',
            status: 'queued'
          }
        });

        // Enqueue to BullMQ worker with staggered delay for Calls-Per-Second (CPS) compliance
        await voiceforceQueue.add('dispatch-call', {
          callSessionId: session.id,
          companyId,
          maxConcurrent: campaign.maxConcurrent || 5
        }, {
          delay: idx * cpsThrottleMs,
          attempts: campaign.retryCount || 2
        });

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

  // ─── Browser Softphone Interactive WebRTC & Testing ───────────────────────
  async processSoftphoneTurn(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      const { id } = req.params;
      const { userMessage } = req.body;

      if (!userMessage || !userMessage.trim()) {
        return res.status(400).json({ error: 'userMessage is required' });
      }

      const session = await (prisma as any).callSession.findFirst({
        where: { id, companyId },
        include: { voiceAgent: true }
      });

      if (!session) return res.status(404).json({ error: 'Call session not found' });

      // Save user transcript segment
      await (prisma as any).callTranscriptSegment.create({
        data: {
          callSessionId: session.id,
          speaker: 'user',
          text: userMessage,
          startTimeMs: 0,
          endTimeMs: 1000
        }
      });

      // Execute AI Agent with real workspace tools
      const { AIAgentExecutor } = await import('@workspace/ai');
      const aiResult = await AIAgentExecutor.execute({
        prompt: userMessage,
        companyId,
        userId: req.user?.id,
        userRole: req.user?.role || 'admin',
        sessionId: session.id
      });

      // Save agent transcript segment
      await (prisma as any).callTranscriptSegment.create({
        data: {
          callSessionId: session.id,
          speaker: 'agent',
          text: aiResult.reply,
          startTimeMs: 1000,
          endTimeMs: 2500
        }
      });

      // If tool was executed, log CallToolExecution
      if (aiResult.toolUsed) {
        await (prisma as any).callToolExecution.create({
          data: {
            callSessionId: session.id,
            toolName: aiResult.toolUsed,
            arguments: {},
            result: aiResult.toolOutput || {},
            durationMs: aiResult.executionTimeMs || 10,
            isSuccess: true
          }
        });
      }

      return res.json({
        success: true,
        data: {
          reply: aiResult.reply,
          toolUsed: aiResult.toolUsed,
          toolOutput: aiResult.toolOutput
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async endSoftphoneCall(req: any, res: Response) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) return res.status(401).json({ error: 'Company ID is required' });
      const { id } = req.params;

      const session = await (prisma as any).callSession.findFirst({
        where: { id, companyId }
      });

      if (!session) return res.status(404).json({ error: 'Call session not found' });

      const endedAt = new Date();
      const startedAt = session.startedAt || session.createdAt;
      const durationSeconds = Math.max(1, Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 1000));

      const updated = await (prisma as any).callSession.update({
        where: { id },
        data: {
          status: 'completed',
          endedAt,
          durationSeconds,
          callOutcome: 'inquiry_resolved'
        }
      });

      return res.json({ success: true, data: updated });
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
        await (prisma as any).company.update({
          where: { id: companyId },
          data: { voiceBalanceInr: 0 }
        });
        return res.json({ success: true, message: `Voiceforce suspended for tenant ${companyId}` });
      }

      return res.status(400).json({ error: 'Invalid killswitch action' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};

