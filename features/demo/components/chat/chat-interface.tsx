import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Zap, Brain, Activity, Cpu, Radio, Waves } from "lucide-react";
import { ChatMessage, ChatMessageProps } from '../ui/chat-message';
import { AgentAvatar } from '../ui/agent-avatar';
import { SessionStatus } from '../../lib/session/types';

interface ChatInterfaceProps {
  businessType: string;
  status: SessionStatus;
  currentAgent: { name: string; id: string };
  messages: ChatMessageProps[];
  isMuted: boolean;
  isUserSpeaking: boolean;
  isAiThinking: boolean;
  toolsExecuting: string[];
  onToggleMute: () => void;
  onDisconnect: () => void;
  onEndDemo: () => void;
}

export function ChatInterface({
  businessType,
  status,
  currentAgent,
  messages,
  isMuted,
  isUserSpeaking,
  isAiThinking,
  toolsExecuting,
  onToggleMute,
  onDisconnect,
  onEndDemo
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/10 overflow-hidden pt-20">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] animate-pulse" />

        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/40 rounded-full animate-ping" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-secondary/50 rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-primary/30 rounded-full animate-ping delay-500" />
        <div className="absolute bottom-1/3 right-2/3 w-2 h-2 bg-secondary/30 rounded-full animate-pulse delay-1000" />

        {/* Vertical Lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/15 to-transparent animate-pulse" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-secondary/15 to-transparent animate-pulse delay-1000" />
        <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-accent/15 to-transparent animate-pulse delay-2000" />

        {/* Diagonal Lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent transform rotate-12 origin-left animate-pulse delay-500" />
        <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-transparent via-secondary/10 to-transparent transform -rotate-12 origin-right animate-pulse delay-1500" />
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="fixed bottom-6 right-6 left-6 z-50">
        <div className="max-w-6xl mx-auto flex justify-end">
          <div className="flex items-center gap-4 bg-background/95 backdrop-blur-xl border-l-4 border-primary/60 px-6 py-3 shadow-2xl shadow-primary/20 rounded-tl-2xl rounded-bl-2xl">
            {/* Agent Status */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <AgentAvatar agentName={currentAgent.name} size="md" />
                {status === 'CONNECTED' && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-background animate-pulse">
                    <div className="w-full h-full bg-accent rounded-full animate-ping" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {businessType} AI Assistant
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'CONNECTED' ? 'bg-accent animate-pulse' :
                    status === 'CONNECTING' ? 'bg-secondary animate-bounce' : 'bg-destructive'
                  }`} />
                  <span className="text-muted-foreground font-mono">{status}</span>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

            {/* Control Buttons */}
            <div className="flex items-center gap-3">
              {status === 'CONNECTED' && (
                <>
                  <button
                    onClick={onToggleMute}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${
                      isMuted
                        ? 'bg-gradient-to-r from-destructive to-destructive/80 shadow-lg shadow-destructive/30'
                        : 'bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4 text-white" />}
                  </button>
                  <button
                    onClick={onDisconnect}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-destructive to-destructive/80 flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg shadow-destructive/30"
                    title="Disconnect"
                  >
                    <PhoneOff className="h-4 w-4 text-white" />
                  </button>
                </>
              )}
              <button
                onClick={onEndDemo}
                className="w-10 h-10 rounded-xl border border-primary/40 bg-background/50 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/20"
                title="End Demo"
              >
                <span className="text-sm font-bold text-primary">×</span>
              </button>
            </div>

            {/* Animated accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-secondary to-accent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 h-[calc(100vh-180px)] flex flex-col pt-20">

          {/* Enhanced Status Indicators */}
          <div className="p-6 border-b border-primary/10 bg-background/30 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-8">
              {/* User Speaking Indicator */}
              <div className={`flex items-center gap-2 transition-all duration-300 ${
                isUserSpeaking ? 'text-accent scale-110' : 'text-muted-foreground'
              }`}>
                <div className="relative">
                  <Radio className="h-5 w-5" />
                  {isUserSpeaking && (
                    <div className="absolute inset-0 animate-ping">
                      <Radio className="h-5 w-5 text-accent/50" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">Voice Input</span>
                {isUserSpeaking && (
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-accent rounded-full animate-pulse" />
                    <div className="w-1 h-3 bg-accent/70 rounded-full animate-pulse delay-100" />
                    <div className="w-1 h-5 bg-accent/50 rounded-full animate-pulse delay-200" />
                  </div>
                )}
              </div>

              {/* AI Thinking Indicator */}
              <div className={`flex items-center gap-2 transition-all duration-300 ${
                isAiThinking ? 'text-secondary scale-110' : 'text-muted-foreground'
              }`}>
                <div className="relative">
                  <Brain className="h-5 w-5" />
                  {isAiThinking && (
                    <div className="absolute inset-0 animate-spin">
                      <Cpu className="h-5 w-5 text-secondary/50" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">AI Processing</span>
                {isAiThinking && (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-secondary/70 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-secondary/50 rounded-full animate-bounce delay-200" />
                  </div>
                )}
              </div>

              {/* Tools Executing Indicator */}
              <div className={`flex items-center gap-2 transition-all duration-300 ${
                toolsExecuting.length > 0 ? 'text-primary scale-110' : 'text-muted-foreground'
              }`}>
                <div className="relative">
                  <Zap className="h-5 w-5" />
                  {toolsExecuting.length > 0 && (
                    <div className="absolute inset-0 animate-pulse">
                      <Activity className="h-5 w-5 text-primary/50" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">Tools Active</span>
                {toolsExecuting.length > 0 && (
                  <div className="data-display px-2 py-1 text-xs">
                    {toolsExecuting.length}
                  </div>
                )}
              </div>
            </div>
          </div>


        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20">
          {messages.length === 0 && status === 'CONNECTED' && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/20 backdrop-blur-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                  <Waves className="h-8 w-8 text-white animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 glow-text">Ready to Chat!</h3>
                <p className="text-muted-foreground text-sm">
                  Start speaking to begin your conversation with the AI assistant.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Connection Status */}
        {status === 'CONNECTING' && (
          <div className="text-center py-8">
            <div className="max-w-sm mx-auto p-6 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-2xl border border-secondary/20 backdrop-blur-sm">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="progress-ring animate-spin">
                  <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-foreground font-medium glow-text">Establishing Neural Link...</p>
              <p className="text-muted-foreground text-sm mt-1">Connecting to AI assistant</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
