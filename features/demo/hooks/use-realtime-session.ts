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
  const [toolsExecuting, setToolsExecuting] = useState<string[]>([]);

  const sessionManagerRef = useRef<RealtimeSessionManager | null>(null);
  const agentManagerRef = useRef<AgentManager | null>(null);
  const isConnectingRef = useRef(false);
  const streamingMessagesRef = useRef<Map<string, Message>>(new Map());
  const pendingAiDeltas = useRef<Array<{itemId: string, delta: string}>>([]);
  const userMessageProcessed = useRef(true);

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

  const updateStreamingMessage = useCallback((itemId: string, delta: string, isUser: boolean) => {
    const streamingMessages = streamingMessagesRef.current;

    if (streamingMessages.has(itemId)) {
      // Update existing message
      const existingMessage = streamingMessages.get(itemId)!;
      const updatedMessage = {
        ...existingMessage,
        content: isUser && existingMessage.content.includes('🎤') ? delta : existingMessage.content + delta
      };
      streamingMessages.set(itemId, updatedMessage);
      setMessages(prev => prev.map(msg => msg.id === existingMessage.id ? updatedMessage : msg));
    } else {
      // Create new message
      const message: Message = {
        id: `stream_${itemId}`,
        type: isUser ? 'user' : 'assistant',
        content: delta,
        timestamp: Date.now(),
        agent: isUser ? undefined : currentAgent.name
      };
      streamingMessages.set(itemId, message);
      setMessages(prev => [...prev, message]);
    }
  }, [currentAgent.name]);

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
      onTranscriptDelta: (delta, isUser, itemId) => {
        console.log('📝 [Hook] DELTA:', { delta, isUser, itemId });
        updateStreamingMessage(itemId, delta, isUser);

        // Set AI thinking state for status indicators
        if (!isUser) {
          setIsAiThinking(true);
        }
      },
      onUserSpeaking: (speaking) => {
        console.log('🎵 [Hook] Audio streaming:', speaking);
        setIsUserSpeaking(speaking);

        if (speaking) {
          // Mark that we're waiting for user message
          userMessageProcessed.current = false;
          pendingAiDeltas.current = [];
        }
      },
      onAiThinking: (thinking) => {
        console.log('🤖 [Hook] AI thinking:', thinking);
        setIsAiThinking(thinking);
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
  }, [agents, initialAgent, addMessage, updateStreamingMessage, currentAgent.name]);

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
