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
  name?: string;
  arguments?: string;
  [key: string]: unknown;
}

export interface SessionCallbacks {
  onStatusChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (fromAgent: string, toAgent: string) => void;
  onTranscriptReceived?: (transcript: string, isUser: boolean) => void;
  onToolExecution?: (toolName: string) => void;
  onError?: (error: string) => void;
}
