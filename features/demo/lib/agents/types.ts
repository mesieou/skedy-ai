import { RealtimeAgent } from '@openai/agents/realtime';

export interface AgentScenario {
  id: string;
  name: string;
  description: string;
  agents: RealtimeAgent[];
  initialAgent: RealtimeAgent;
}

export interface AgentHandoffEvent {
  fromAgent: string;
  toAgent: string;
  reason?: string;
  timestamp: number;
}

export type AgentName = 'greeting' | 'booking';

export interface AgentConfig {
  name: AgentName;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  instructions: string;
  handoffDescription: string;
  colorScheme: string;
}
