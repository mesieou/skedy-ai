"use client";

import React, { useEffect } from 'react';
import { useRealtimeSession } from '../hooks/use-realtime-session';
import { ChatInterface } from './chat/chat-interface';
import { SessionConfig } from '../lib/session/types';

interface DemoHeroProps {
  businessType: string;
  sessionData: SessionConfig | null;
  onEndDemo: () => void;
}

export function DemoHero({ businessType, sessionData, onEndDemo }: DemoHeroProps) {
  const {
    status,
    currentAgent,
    messages,
    isMuted,
    isUserSpeaking,
    isAiThinking,
    toolsExecuting,
    connect,
    disconnect,
    toggleMute
  } = useRealtimeSession();

  // Auto-connect when sessionData is provided
  useEffect(() => {
    if (sessionData && status === 'DISCONNECTED') {
      console.log('🚀 [DemoHero] Auto-connecting with session data');
      connect(sessionData);
    }
  }, [sessionData, status, connect]);

  // Always show chat interface - let it handle its own connection states
  // The chat interface has its own beautiful futuristic connecting screen

  // Show chat interface when connected
  return (
    <ChatInterface
      businessType={businessType}
      status={status}
      currentAgent={currentAgent}
      messages={messages}
      isMuted={isMuted}
      isUserSpeaking={isUserSpeaking}
      isAiThinking={isAiThinking}
      toolsExecuting={toolsExecuting}
      onToggleMute={toggleMute}
      onDisconnect={disconnect}
      onEndDemo={onEndDemo}
    />
  );
}
