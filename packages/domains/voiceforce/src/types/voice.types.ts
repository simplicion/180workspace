export type VoiceSessionStatus = 
  | 'queued' 
  | 'dialing' 
  | 'ringing' 
  | 'in_progress' 
  | 'completed' 
  | 'no_answer' 
  | 'busy' 
  | 'failed' 
  | 'voicemail';

export interface VoiceEngineEvents {
  onTranscript: (speaker: 'agent' | 'user', text: string, isFinal: boolean) => void;
  onAudioChunk: (pcmAudioBuffer: Buffer) => void;
  onToolCallStart: (toolName: string, args: Record<string, any>) => void;
  onToolCallEnd: (toolName: string, result: any) => void;
  onInterrupted: () => void;
  onError: (error: Error) => void;
  onCallEnd: (reason: string) => void;
}

export interface VoiceSessionConfig {
  callSessionId: string;
  companyId: string;
  userId?: string;
  voiceAgentId?: string;
  agentName?: string;
  systemPrompt: string;
  firstMessage?: string;
  voiceId: string;
  language?: string;
  enabledTools: string[];
  allowBargeIn?: boolean;
  maxDurationSeconds?: number;
  inactivityTimeoutMs?: number;
  autoGreet?: boolean;
}

export interface PostCallSummaryResult {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  callOutcome: string;
  actionItems: string[];
  followUpRequired: boolean;
  structuredData?: Record<string, any>;
}
