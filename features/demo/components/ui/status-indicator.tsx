import React from 'react';
import { Activity, Brain, Loader2, Radio, Cpu, Zap, Waves, Signal } from 'lucide-react';

interface StatusIndicatorProps {
  isUserSpeaking: boolean;
  isAiThinking: boolean;
  toolsExecuting: string[];
}

export function StatusIndicator({ isUserSpeaking, isAiThinking, toolsExecuting }: StatusIndicatorProps) {
  return (
    <div className="futuristic-card p-6 mb-6 bg-gradient-to-r from-background/80 via-background/90 to-background/80 border-primary/20">
      <div className="flex items-center justify-center gap-8">
        {/* User Speaking Indicator */}
        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
          isUserSpeaking
            ? 'bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 scale-110 shadow-lg shadow-primary/20'
            : 'bg-muted/20 border border-muted/30'
        }`}>
          <div className="relative">
            <Radio className={`h-5 w-5 ${isUserSpeaking ? 'text-primary' : 'text-muted-foreground'}`} />
            {isUserSpeaking && (
              <>
                <div className="absolute inset-0 animate-ping">
                  <Radio className="h-5 w-5 text-primary/50" />
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
              </>
            )}
          </div>

          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${isUserSpeaking ? 'text-primary glow-text' : 'text-muted-foreground'}`}>
              Voice Input
            </span>
            <span className="text-xs text-muted-foreground">
              {isUserSpeaking ? 'Active' : 'Standby'}
            </span>
          </div>

          {isUserSpeaking && (
            <div className="flex gap-1 ml-2">
              <div className="w-1 h-6 bg-primary rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-primary/70 rounded-full animate-pulse delay-100" />
              <div className="w-1 h-8 bg-primary/50 rounded-full animate-pulse delay-200" />
              <div className="w-1 h-5 bg-primary/30 rounded-full animate-pulse delay-300" />
            </div>
          )}
        </div>

        {/* Neural Link Separator */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-px bg-gradient-to-r from-primary via-secondary to-accent animate-pulse" />
          <Signal className="h-4 w-4 text-secondary animate-pulse" />
          <div className="w-8 h-px bg-gradient-to-r from-accent via-secondary to-primary animate-pulse" />
        </div>

        {/* AI Thinking Indicator */}
        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
          isAiThinking
            ? 'bg-gradient-to-r from-secondary/20 to-secondary/10 border border-secondary/40 scale-110 shadow-lg shadow-secondary/20'
            : 'bg-muted/20 border border-muted/30'
        }`}>
          <div className="relative">
            <Brain className={`h-5 w-5 ${isAiThinking ? 'text-secondary' : 'text-muted-foreground'}`} />
            {isAiThinking && (
              <>
                <div className="absolute inset-0 animate-spin">
                  <Cpu className="h-5 w-5 text-secondary/50" />
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-bounce" />
              </>
            )}
          </div>

          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${isAiThinking ? 'text-secondary glow-text' : 'text-muted-foreground'}`}>
              Neural Processing
            </span>
            <span className="text-xs text-muted-foreground">
              {isAiThinking ? 'Computing' : 'Idle'}
            </span>
          </div>

          {isAiThinking && (
            <div className="flex gap-1 ml-2">
              <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-secondary/70 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-secondary/50 rounded-full animate-bounce delay-200" />
            </div>
          )}
        </div>

        {/* Tools Executing */}
        {toolsExecuting.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-px bg-gradient-to-r from-secondary via-accent to-primary animate-pulse" />
              <Waves className="h-4 w-4 text-accent animate-pulse" />
              <div className="w-8 h-px bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            </div>

            <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/40 scale-110 shadow-lg shadow-accent/20">
              <div className="relative">
                <Zap className="h-5 w-5 text-accent" />
                <div className="absolute inset-0 animate-pulse">
                  <Activity className="h-5 w-5 text-accent/50" />
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-accent glow-text">
                  Tools Active
                </span>
                <span className="text-xs text-muted-foreground">
                  {toolsExecuting.length} running
                </span>
              </div>

              <div className="data-display px-3 py-1 ml-2 border-accent/40 bg-accent/10">
                <span className="text-accent font-bold">{toolsExecuting.length}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom scan line */}
      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
    </div>
  );
}
