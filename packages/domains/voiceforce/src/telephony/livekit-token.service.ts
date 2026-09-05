import { AccessToken } from 'livekit-server-sdk';

export interface LiveKitTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  isAgent?: boolean;
  metadata?: Record<string, any>;
  ttlSeconds?: number;
}

export class LiveKitTokenService {
  private apiKey: string;
  private apiSecret: string;
  private livekitUrl: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || 'API_KEY_180VOICEFORCE';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || 'SECRET_KEY_180VOICEFORCE_ENTERPRISE_TOKEN';
    this.livekitUrl = process.env.LIVEKIT_URL || 'ws://host.docker.internal:7880';
  }

  /**
   * Generates a signed LiveKit JWT access token for client/browser or worker connection
   */
  async generateToken(options: LiveKitTokenOptions): Promise<{ token: string; url: string }> {
    const {
      roomName,
      participantIdentity,
      participantName,
      isAgent = false,
      metadata = {},
      ttlSeconds = 3600
    } = options;

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName || participantIdentity,
      metadata: JSON.stringify(metadata),
      ttl: `${ttlSeconds}s`
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      hidden: isAgent // Voice agent can optionally be marked hidden or visible
    });

    const token = await at.toJwt();

    return {
      token,
      url: this.livekitUrl
    };
  }
}
