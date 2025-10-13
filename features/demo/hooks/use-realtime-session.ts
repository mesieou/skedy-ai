import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeSessionManager } from '../lib/session/realtime-session-manager';
import { OpenAIService } from '../lib/services/openai-service';
import { SessionStatus, SessionConfig } from '../lib/session/types';
import * as Sentry from '@sentry/nextjs';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  agent?: string;
  toolName?: string;
  isProcessing?: boolean;
}

export function useRealtimeSession() {
  const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');
  const [currentAgent] = useState<{ name: string; id: string }>({ name: 'Backend Agent', id: 'backend' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [toolsExecuting, setToolsExecuting] = useState<string[]>([]);

  const sessionManagerRef = useRef<RealtimeSessionManager | null>(null);
  const isConnectingRef = useRef(false);
  const streamingMessagesRef = useRef<Map<string, Message>>(new Map());
  const pendingAiDeltas = useRef<Array<{itemId: string, delta: string}>>([]);
  const userMessageProcessed = useRef(true);
  const messageCounterRef = useRef(0);

  const addMessage = useCallback((type: 'user' | 'assistant' | 'system' | 'tool', content: string, options?: {
    agent?: string;
    toolName?: string;
    isProcessing?: boolean;
  }) => {
    const message: Message = {
      id: `msg_${++messageCounterRef.current}`,
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
    sessionManagerRef.current = new RealtimeSessionManager({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'CONNECTED') {
          addMessage('system', `🚀 Connected - Start speaking!`);
        }
      },
      onAgentHandoff: (fromAgent, toAgent) => {
        // Since we're using backend agents, just log the handoff
        addMessage('system', `🔄 Transferred to ${toAgent} specialist`);
        Sentry.addBreadcrumb({
          message: 'Demo agent handoff',
          category: 'demo-agent',
          data: {
            fromAgent: fromAgent,
            toAgent: toAgent
          }
        });
      },
      onTranscriptDelta: (delta, isUser, itemId) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount/unmount

  const connect = useCallback(async (config: SessionConfig) => {
    if (!sessionManagerRef.current || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    addMessage('system', '🔗 Initializing AI connection...');

    try {
      const openAIService = OpenAIService.getInstance();
      console.log('🎯 [Hook] Connecting with business category:', config.tradieType.id);
      const sessionData = await openAIService.getEphemeralKey(config.tradieType.id);

      const backendSession = sessionData.session as Record<string, unknown>;
      console.log('🎯 [Hook] Backend session created:', {
        sessionId: backendSession?.id,
        businessName: (backendSession?.businessEntity as Record<string, unknown>)?.name,
        toolsCount: (backendSession?.currentTools as unknown[])?.length || 0
      });

      await sessionManagerRef.current.connect(config, sessionData.value, backendSession?.id as string, sessionData.session);
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
    sessionManager: sessionManagerRef.current
  };
}
