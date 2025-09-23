"use client";

import { Button } from "@/features/shared/components/ui/button";

interface ChatControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  isListening: boolean;
  onToggleMute: () => void;
  onEndDemo: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
}

export function ChatControls({
  isConnected,
  isMuted,
  isListening,
  onToggleMute,
  onEndDemo,
  onStartListening,
  onStopListening
}: ChatControlsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant={isMuted ? "destructive" : "outline"}
          size="sm"
          onClick={onToggleMute}
          disabled={!isConnected}
        >
          {isMuted ? "🔇 Unmute" : "🎤 Mute"}
        </Button>

        <Button
          variant={isListening ? "destructive" : "outline"}
          size="sm"
          onClick={isListening ? onStopListening : onStartListening}
          disabled={!isConnected}
        >
          {isListening ? "⏹️ Stop" : "🎙️ Listen"}
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onEndDemo}
      >
        End Demo
      </Button>
    </div>
  );
}
