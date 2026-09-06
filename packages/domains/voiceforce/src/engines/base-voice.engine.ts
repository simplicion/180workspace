import { VoiceSessionConfig, VoiceEngineEvents } from '../types/voice.types';

export abstract class BaseVoiceEngine {
  protected config: VoiceSessionConfig;
  protected events: VoiceEngineEvents;

  constructor(config: VoiceSessionConfig, events: VoiceEngineEvents) {
    this.config = config;
    this.events = events;
  }

  abstract start(): Promise<void>;
  abstract speakGreeting(): Promise<void>;
  abstract processIncomingAudio(pcmChunk: Int16Array | Buffer): void;
  abstract handleBargeIn(): void;
  abstract stop(reason?: string): Promise<void>;
}
