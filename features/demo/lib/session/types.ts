export type SessionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export interface SessionConfig {
  businessType: string;
  sessionId: string;
  ephemeralToken: string;
  tradieType: {
    id: string;
    label: string;
    description: string;
    businessId: string;
  };
}

export interface TransportEvent {
  type: string;
  transcript?: string;
  delta?: string;
  item_id?: string;
  name?: string;
  arguments?: string;
  [key: string]: unknown;
}

export interface SessionCallbacks {
  onStatusChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (fromAgent: string, toAgent: string) => void;
  onTranscriptReceived?: (transcript: string, isUser: boolean) => void;
  onTranscriptDelta?: (delta: string, isUser: boolean, itemId: string) => void;
  onTranscriptComplete?: (itemId: string) => void;
  onUserSpeaking?: (speaking: boolean) => void;
  onAiThinking?: (thinking: boolean) => void;
  onToolExecution?: (toolName: string) => void;
  onToolResult?: (toolName: string, result: Record<string, unknown>, success: boolean) => void;
  onError?: (error: string) => void;
}
