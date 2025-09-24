import React, { useState, useEffect } from 'react';
import { User, Sparkles, Loader2, Bot, Zap, Terminal, Clock } from 'lucide-react';
import { AgentAvatar } from './agent-avatar';

export interface ChatMessageProps {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  agent?: string;
  toolName?: string;
  isProcessing?: boolean;
}

export function ChatMessage({
  type,
  content,
  timestamp,
  agent,
  toolName,
  isProcessing
}: ChatMessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Typewriter effect for assistant messages
    if (type === 'assistant' && content) {
      setIsTyping(true);
      setDisplayedContent('');

      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    } else {
      setDisplayedContent(content);
    }
  }, [content, type]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getMessageStyles = () => {
    const baseStyles = "transition-all duration-500 hover:scale-[1.01] relative overflow-hidden";

    switch (type) {
      case 'user':
        return `${baseStyles} bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-l-4 border-primary/60 ml-8 shadow-lg shadow-primary/10 rounded-r-2xl rounded-l-sm pl-6 pr-4 py-4`;
      case 'assistant':
        return `${baseStyles} bg-gradient-to-bl from-secondary/10 via-secondary/5 to-transparent border-r-4 border-secondary/60 mr-8 shadow-lg shadow-secondary/10 rounded-l-2xl rounded-r-sm pl-4 pr-6 py-4`;
      case 'tool':
        return `${baseStyles} bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-t-4 border-accent/60 mx-6 shadow-lg shadow-accent/10 rounded-b-2xl rounded-t-sm px-4 py-4`;
      default:
        return `${baseStyles} bg-gradient-to-br from-muted/20 via-muted/10 to-transparent border-l-2 border-muted/30 mx-6 shadow-lg shadow-muted/10 rounded-r-xl rounded-l-sm px-4 py-4`;
    }
  };

  const getAvatarComponent = () => {
    switch (type) {
      case 'user':
        return (
          <div className="relative">
            <div className="p-3 bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/30 futuristic-card border-primary/50">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
          </div>
        );
      case 'assistant':
        return (
          <div className="relative">
            <AgentAvatar agentName={agent} size="md" />
            {isTyping && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-background animate-pulse">
                <div className="w-full h-full bg-secondary rounded-full animate-ping" />
              </div>
            )}
          </div>
        );
      case 'tool':
        return (
          <div className="relative">
            <div className="p-3 bg-gradient-to-r from-accent to-accent/80 rounded-xl shadow-lg shadow-accent/30 futuristic-card border-accent/50">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-bounce" />
          </div>
        );
      default:
        return (
          <div className="p-3 bg-gradient-to-r from-muted to-muted/80 rounded-xl shadow-lg shadow-muted/30 futuristic-card border-muted/50">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        );
    }
  };

  const getLabelStyles = () => {
    switch (type) {
      case 'user':
        return 'data-display border-primary/40 text-primary bg-primary/10';
      case 'assistant':
        return 'data-display border-secondary/40 text-secondary bg-secondary/10';
      case 'tool':
        return 'data-display border-accent/40 text-accent bg-accent/10';
      default:
        return 'data-display border-muted/40 text-muted-foreground bg-muted/10';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'user': return 'You';
      case 'assistant': return `${agent || 'AI'} Agent`;
      case 'tool': return toolName || 'System Tool';
      default: return 'System';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'user': return <User className="h-3 w-3" />;
      case 'assistant': return <Bot className="h-3 w-3" />;
      case 'tool': return <Zap className="h-3 w-3" />;
      default: return <Sparkles className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={`transform transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`flex gap-4 ${getMessageStyles()}`}>
        {/* Directional accent line */}
        {type === 'user' && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
        )}
        {type === 'assistant' && (
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary via-secondary/50 to-transparent" />
        )}
        {type === 'tool' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent/50 to-transparent" />
        )}

        <div className="flex-shrink-0 relative z-10">
          {getAvatarComponent()}
        </div>

        <div className="flex-1 space-y-3 relative z-10">
          <div className="flex items-center gap-3 text-xs">
            <div className={`flex items-center gap-2 font-semibold px-3 py-1.5 rounded-full ${getLabelStyles()}`}>
              {getTypeIcon()}
              <span>{getLabel()}</span>
            </div>

            <div className="data-display px-2 py-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-primary">{formatTime(timestamp)}</span>
            </div>

            {isProcessing && (
              <div className="data-display px-3 py-1 flex items-center gap-2 border-secondary/40 bg-secondary/10">
                <Loader2 className="h-3 w-3 animate-spin text-secondary" />
                <span className="text-secondary font-medium">Processing...</span>
              </div>
            )}
          </div>

          <div className="relative">
            <p className="text-sm leading-relaxed text-foreground font-medium">
              {displayedContent}
              {isTyping && (
                <span className="inline-block w-2 h-5 bg-secondary ml-1 animate-pulse" />
              )}
            </p>

            {/* Holographic effect for assistant messages */}
            {type === 'assistant' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/5 to-transparent animate-pulse pointer-events-none" />
            )}
          </div>
        </div>

        {/* Directional corner indicators */}
        {type === 'user' && (
          <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-primary/40" />
        )}
        {type === 'assistant' && (
          <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-secondary/40" />
        )}
        {type === 'tool' && (
          <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-accent/40" />
        )}
      </div>
    </div>
  );
}
