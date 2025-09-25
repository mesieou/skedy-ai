// Demo feature exports
export { DemoModal } from './components/demo-modal';
export { DemoHero } from './components/demo-hero';

// UI Components
export { ChatMessage } from './components/ui/chat-message';
export { AgentAvatar } from './components/ui/agent-avatar';
export { StatusIndicator } from './components/ui/status-indicator';
export { ToolIndicator } from './components/ui/tool-indicator';
export { LandingInterface } from './components/ui/landing-interface';
export { ChatInterface } from './components/chat/chat-interface';

// Hooks
export { useRealtimeSession } from './hooks/use-realtime-session';

// Services
export { OpenAIService } from './lib/services/openai-service';
export { RealtimeSessionManager } from './lib/session/realtime-session-manager';

// Type exports
export type * from './types';
