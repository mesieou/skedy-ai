import { RealtimeAgent } from '@openai/agents/realtime';
import { AgentHandoffEvent, AgentName } from './types';

export class AgentManager {
  private agents: Map<string, RealtimeAgent>;
  private currentAgent: RealtimeAgent;
  private handoffHistory: AgentHandoffEvent[] = [];

  constructor(agents: RealtimeAgent[], initialAgent: RealtimeAgent) {
    this.agents = new Map(agents.map(agent => [agent.name, agent]));
    this.currentAgent = initialAgent;
  }

  getCurrentAgent(): RealtimeAgent {
    return this.currentAgent;
  }

  getAgent(name: string): RealtimeAgent | undefined {
    return this.agents.get(name);
  }

  getAllAgents(): RealtimeAgent[] {
    return Array.from(this.agents.values());
  }

  handoffToAgent(agentName: string, reason?: string): RealtimeAgent | null {
    const targetAgent = this.agents.get(agentName);
    if (!targetAgent) {
      console.error(`❌ [AgentManager] Agent not found: ${agentName}`);
      return null;
    }

    const handoffEvent: AgentHandoffEvent = {
      fromAgent: this.currentAgent.name,
      toAgent: agentName,
      reason,
      timestamp: Date.now()
    };

    this.handoffHistory.push(handoffEvent);
    this.currentAgent = targetAgent;

    console.log(`🔄 [AgentManager] Handoff: ${handoffEvent.fromAgent} → ${agentName}`);
    return targetAgent;
  }

  getHandoffHistory(): AgentHandoffEvent[] {
    return [...this.handoffHistory];
  }

  getAgentColorScheme(agentName?: string): string {
    switch (agentName) {
      case 'greeting': return 'from-blue-500 to-cyan-500';
      case 'booking': return 'from-green-500 to-emerald-500';
      default: return 'from-purple-500 to-pink-500';
    }
  }
}
