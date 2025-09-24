import React from 'react';
import { Bot, Activity, Brain, Zap } from 'lucide-react';

interface LandingInterfaceProps {
  businessType: string;
}

export function LandingInterface({ businessType }: LandingInterfaceProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-secondary/40 rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-accent/30 rounded-full animate-bounce" />
      </div>

      {/* Landing Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="text-center space-y-6 max-w-2xl">
          <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 w-20 h-20 mx-auto flex items-center justify-center">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {businessType} AI Assistant
          </h1>
          <p className="text-xl text-muted-foreground">
            Ready to experience the future of AI-powered service booking?
          </p>
          <div className="bg-muted/30 rounded-2xl p-6 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-4">
              Click &ldquo;Try Web Demo&rdquo; in the modal to start your conversation with our AI assistant
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Real-time speech</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>AI thinking</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>Tool execution</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
