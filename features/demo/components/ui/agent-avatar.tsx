import React from 'react';
import { Bot, Brain, Zap } from 'lucide-react';

interface AgentAvatarProps {
  agentName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AgentAvatar({ agentName, size = 'md' }: AgentAvatarProps) {
  const getAgentColorScheme = (agentName?: string): string => {
    switch (agentName) {
      case 'greeting': return 'from-primary to-secondary';
      case 'booking': return 'from-secondary to-accent';
      default: return 'from-secondary via-primary to-accent';
    }
  };

  const getAgentIcon = (agentName?: string) => {
    switch (agentName) {
      case 'greeting': return Brain;
      case 'booking': return Zap;
      default: return Bot;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return { container: 'w-8 h-8 p-2', icon: 'h-4 w-4' };
      case 'lg': return { container: 'w-16 h-16 p-4', icon: 'h-8 w-8' };
      default: return { container: 'w-12 h-12 p-3', icon: 'h-6 w-6' };
    }
  };

  const sizeClasses = getSizeClasses();
  const IconComponent = getAgentIcon(agentName);

  return (
    <div className="relative">
      {/* Main Avatar */}
      <div className={`${sizeClasses.container} bg-gradient-to-r ${getAgentColorScheme(agentName)} rounded-xl shadow-lg shadow-secondary/30 futuristic-card border-secondary/50 relative overflow-hidden`}>
        {/* Holographic scan line */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />

        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-2 right-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-700" />
          <div className="absolute bottom-2 right-2 w-1 h-1 bg-white rounded-full animate-pulse delay-500" />
        </div>

        <IconComponent className={`${sizeClasses.icon} text-white relative z-10`} />

        {/* Corner brackets */}
        <div className="absolute top-0.5 left-0.5 w-2 h-2 border-l border-t border-white/50" />
        <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-r border-b border-white/50" />
      </div>

      {/* Orbital rings */}
      <div className="absolute inset-0 rounded-full border border-secondary/30 animate-spin" style={{ animationDuration: '8s' }} />
      <div className="absolute inset-1 rounded-full border border-primary/20 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />

      {/* Energy particles */}
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
      <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
    </div>
  );
}
