import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeAgent } from '@openai/agents/realtime';
import { RealtimeSessionManager } from '../lib/session/realtime-session-manager';
import { AgentManager } from '../lib/agents/agent-manager';
import { OpenAIService } from '../lib/services/openai-service';
import { SessionStatus, SessionConfig } from '../lib/session/types';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  agent?: string;
  toolName?: string;
  isProcessing?: boolean;
}

export function useRealtimeSession(agents: RealtimeAgent[], initialAgent: RealtimeAgent) {
  const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');
  const [currentAgent, setCurrentAgent] = useState<RealtimeAgent>(initialAgent);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [toolsExecuting, setToolsExecuting] = useState<string[]>([]);

  const sessionManagerRef = useRef<RealtimeSessionManager | null>(null);
  const agentManagerRef = useRef<AgentManager | null>(null);
  const isConnectingRef = useRef(false);

  const addMessage = useCallback((type: 'user' | 'assistant' | 'system' | 'tool', content: string, options?: {
    agent?: string;
    toolName?: string;
    isProcessing?: boolean;
  }) => {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: Date.now(),
      ...options
    };
    setMessages(prev => [...prev, message]);
  }, []);

  // Initialize managers
  useEffect(() => {
    agentManagerRef.current = new AgentManager(agents, initialAgent);

    sessionManagerRef.current = new RealtimeSessionManager(agentManagerRef.current, {
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'CONNECTED') {
          addMessage('system', `🚀 Connected - Start speaking!`);
        }
      },
      onAgentHandoff: (fromAgent, toAgent) => {
        const newAgent = agentManagerRef.current?.getAgent(toAgent);
        if (newAgent) {
          setCurrentAgent(newAgent);
          addMessage('system', `🔄 Transferred to ${toAgent} specialist`);
        }
      },
      onTranscriptReceived: (transcript, isUser) => {
        if (isUser) {
          addMessage('user', transcript);
          setCurrentTranscript('');
          setIsUserSpeaking(false);
        } else {
          addMessage('assistant', transcript, { agent: currentAgent.name });
          setIsAiThinking(false);
        }
      },
      onToolExecution: (toolName) => {
        addMessage('tool', `🔧 Executing: ${toolName}`, { toolName, isProcessing: true });
        setToolsExecuting(prev => [...prev, toolName]);
      },
      onError: (error) => {
        addMessage('system', `❌ Error: ${error}`);
      }
    });

    return () => {
      sessionManagerRef.current?.disconnect();
    };
  }, [agents, initialAgent, addMessage, currentAgent.name]);

  const connect = useCallback(async (config: SessionConfig) => {
    if (!sessionManagerRef.current || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    addMessage('system', '🔗 Initializing AI connection...');

    try {
      const openAIService = OpenAIService.getInstance();
      const ephemeralKey = await openAIService.getEphemeralKey();
      await sessionManagerRef.current.connect(config, ephemeralKey);
    } catch (error) {
      console.error('❌ Connection failed:', error);
      addMessage('system', `❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isConnectingRef.current = false;
    }
  }, [addMessage]);

  const disconnect = useCallback(() => {
    sessionManagerRef.current?.disconnect();
    addMessage('system', '🔌 Disconnected');
  }, [addMessage]);

  const toggleMute = useCallback(() => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.mute(!isMuted);
      setIsMuted(!isMuted);
      addMessage('system', isMuted ? '🎤 Microphone unmuted' : '🔇 Microphone muted');
    }
  }, [isMuted, addMessage]);

  return {
    // State
    status,
    currentAgent,
    messages,
    isMuted,
    isUserSpeaking,
    isAiThinking,
    currentTranscript,
    toolsExecuting,

    // Actions
    connect,
    disconnect,
    toggleMute,

    // Managers (for advanced usage)
    agentManager: agentManagerRef.current,
    sessionManager: sessionManagerRef.current
  };
}
