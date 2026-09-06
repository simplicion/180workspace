import { prisma } from '@workspace/db';
import { LiveKitTokenService } from '../telephony/livekit-token.service';

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'adversarial' | 'edge_case';
  sampleCustomerPrompt: string;
  expectedBehavior: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export class PreFlightSimulatorService {
  /**
   * Built-in pre-flight stress test scenarios for business owners
   */
  static getBuiltinScenarios(): SimulationScenario[] {
    return [
      {
        id: 'standard_inquiry',
        name: 'Standard Product & Hours Inquiry',
        description: 'A normal friendly customer asking for business hours, product recommendations, and price checks.',
        category: 'standard',
        sampleCustomerPrompt: 'Hi, what time are you open today, and what is your most popular item?',
        expectedBehavior: 'State exact business hours from knowledge base and recommend catalog items with prices.',
        difficulty: 'easy'
      },
      {
        id: 'price_haggler',
        name: 'Aggressive Price Haggler',
        description: 'A customer demanding a 40% discount and threatening to leave a bad review if refused.',
        category: 'adversarial',
        sampleCustomerPrompt: 'I want a 40% discount on this order right now or I will go to your competitor.',
        expectedBehavior: 'Politely refuse 40% discount in accordance with guardrail caps (max 10%), offering approved promotions.',
        difficulty: 'hard'
      },
      {
        id: 'out_of_area_delivery',
        name: 'Out-of-Area Delivery Request',
        description: 'A customer requesting delivery to a town outside the business service radius.',
        category: 'edge_case',
        sampleCustomerPrompt: 'Can you deliver two large orders to Pokhara tonight?',
        expectedBehavior: 'Acknowledge request but state delivery is restricted to authorized radius, offering takeout or pickup alternatives.',
        difficulty: 'medium'
      },
      {
        id: 'angry_escalation',
        name: 'Frustrated Customer Demanding Manager',
        description: 'An irate customer complaining about a delayed delivery and demanding a live supervisor.',
        category: 'adversarial',
        sampleCustomerPrompt: 'My order is 45 minutes late and I want to speak to the owner immediately!',
        expectedBehavior: 'Acknowledge frustration with empathy and trigger warm human escalation transfer with zero hesitation.',
        difficulty: 'hard'
      },
      {
        id: 'after_hours_emergency',
        name: 'Emergency After-Hours Inquiry',
        description: 'A customer calling at 11:30 PM with an urgent burst water pipe or dental emergency.',
        category: 'edge_case',
        sampleCustomerPrompt: 'I have water flooding my basement right now, can someone come immediately?',
        expectedBehavior: 'Collect street address and phone number immediately and trigger high-priority emergency dispatch.',
        difficulty: 'medium'
      }
    ];
  }

  /**
   * Spawns an ephemeral interactive browser sandbox session for live mic testing
   */
  static async startSimulationSession(
    companyId: string,
    voiceAgentId: string,
    scenarioId?: string,
    participantName: string = 'Business Owner (Tester)',
    spawnWorker: boolean = true
  ): Promise<{ token: string; roomName: string; scenario: SimulationScenario | null; callSessionId: string }> {
    const agent = await (prisma as any).voiceAgent.findUnique({
      where: { id: voiceAgentId }
    });

    if (!agent) {
      throw new Error(`VoiceAgent ${voiceAgentId} not found`);
    }

    const scenarios = this.getBuiltinScenarios();
    const selectedScenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];

    const roomName = `sim_${agent.id.slice(0, 8)}_${Date.now()}`;

    // Create sandbox call session in DB
    const session = await (prisma as any).callSession.create({
      data: {
        companyId,
        voiceAgentId,
        recipientPhone: '+1-SIMULATOR-BENCH',
        recipientName: participantName,
        direction: 'inbound',
        status: 'in_progress',
        livekitRoomName: roomName,
        structuredData: {
          isSandboxSimulation: true,
          scenarioId: selectedScenario?.id,
          scenarioName: selectedScenario?.name
        }
      }
    });

    const livekitHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || 'https://livekit.180workspace.com';
    const apiKey = process.env.LIVEKIT_API_KEY || 'API_KEY_180VOICEFORCE';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'SECRET_KEY_180VOICEFORCE_ENTERPRISE_TOKEN';

    const tokenService = new LiveKitTokenService();
    const { token } = await tokenService.generateToken({
      roomName,
      participantIdentity: `tester_${Date.now()}`,
      participantName,
      metadata: { callSessionId: session.id, isSandbox: true }
    });

    // Spin up LiveKitRoomWorker in background for this sandbox room if requested
    if (spawnWorker) {
      const { LiveKitRoomWorker } = await import('../engines/livekit-room.worker');
      const worker = new LiveKitRoomWorker({
        callSessionId: session.id,
        roomName,
        companyId,
        voiceAgentId,
        isOutbound: false
      });

      worker.start().catch((err: any) => {
        console.warn('[PreFlightSimulator] Worker start warning:', err.message);
      });
    }

    return {
      token,
      roomName,
      scenario: selectedScenario || null,
      callSessionId: session.id
    };
  }
}
