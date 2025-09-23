"use client";

import { useState, useEffect } from "react";
import { ChatStatusIndicator } from "./chat-status-indicator";
import { ChatMessages } from "./chat-messages";
import { ChatControls } from "./chat-controls";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

interface ChatHeroProps {
  businessType: string;
  sessionData: { sessionId: string; ephemeralToken: string; tradieType: { id: string; label: string; description: string; businessId: string } } | null;
  onEndDemo: () => void;
}

export function ChatHero({ businessType, sessionData, onEndDemo }: ChatHeroProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAiTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  console.log('🏠 [ChatHero] Component rendering with sessionData:', !!sessionData);

  const addMessage = (type: 'user' | 'ai' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  useEffect(() => {
    if (sessionData && !isConnected && !isConnecting) {
      console.log('🎭 [ChatHero] Starting real connection with ephemeral token:', sessionData.ephemeralToken);

      // Clear messages when session changes
      setMessages([]);
      setIsConnected(false);
      setIsConnecting(true);

      // Simple WebRTC connection with backend attachment
      addMessage('system', `Connecting to ${businessType} AI assistant...`);

      const initWebRTC = async () => {
        try {
          console.log('🌐 [ChatHero] Starting WebRTC connection with token:', sessionData.ephemeralToken);

          // Create peer connection
          const pc = new RTCPeerConnection();

          // Set up audio element for playback
          const audioElement = document.createElement("audio");
          audioElement.autoplay = true;
          audioElement.controls = false;
          audioElement.style.display = 'none';
          document.body.appendChild(audioElement);

          // Handle incoming audio from AI
          pc.ontrack = (e) => {
            console.log('🎵 [ChatHero] Received remote audio track, streams:', e.streams.length);
            if (e.streams[0]) {
              audioElement.srcObject = e.streams[0];
              console.log('🎵 [ChatHero] Audio element srcObject set');
            }
          };

          // Get microphone access
          const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
          pc.addTrack(ms.getTracks()[0]);

          // Set up data channel
          const dc = pc.createDataChannel("oai-events");

          dc.onopen = () => {
            console.log('📡 [ChatHero] Data channel opened');
            setIsConnected(true);
            setIsConnecting(false);
            addMessage('system', `Connected to ${businessType} AI assistant. Start speaking to begin!`);
          };

          dc.onclose = () => {
            console.log('📡 [ChatHero] Data channel closed');
            setIsConnected(false);
            addMessage('system', 'Connection closed');
          };

          dc.onmessage = async (e) => {
            try {
              const event = JSON.parse(e.data);
              console.log('📨 [ChatHero] Forwarding event to backend:', event.type);

              // Forward all events to backend for processing (reuses existing logic)
              await fetch('/api/voice/demo-webrtc-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: sessionData.sessionId,
                  event: event
                })
              });

              // Handle UI-specific events
              if (event.type === 'response.output_audio_transcript.done') {
                addMessage('ai', event.transcript || 'AI response received');
              }
            } catch (error) {
              console.error('❌ [ChatHero] Failed to process event:', error);
            }
          };

          // Create offer and send directly to OpenAI with ephemeral token
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          console.log('🔗 [ChatHero] SDP offer created with audio tracks');
          console.log('🔗 [ChatHero] Sending SDP directly to OpenAI with ephemeral token...');

          // Use ephemeral token approach - send SDP directly to OpenAI
          const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
            method: "POST",
            body: offer.sdp,
            headers: {
              Authorization: `Bearer ${sessionData.ephemeralToken}`,
              "Content-Type": "application/sdp",
            },
          });

          if (!sdpResponse.ok) {
            throw new Error(`Demo session failed: ${sdpResponse.status} ${sdpResponse.statusText}`);
          }

          const answer = {
            type: "answer" as RTCSdpType,
            sdp: await sdpResponse.text(),
          };

          await pc.setRemoteDescription(answer);
          console.log('✅ [ChatHero] WebRTC connection established');

        } catch (error) {
          console.error('❌ [ChatHero] WebRTC connection failed:', error);
          setIsConnecting(false);
          addMessage('system', 'Connection failed. Please try again.');
        }
      };

      initWebRTC();
    }
  }, [sessionData, businessType, isConnected, isConnecting]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    addMessage('system', isMuted ? 'Microphone unmuted' : 'Microphone muted');
  };

  const handleStartListening = () => {
    setIsListening(true);
    addMessage('system', 'Listening...');
  };

  const handleStopListening = () => {
    setIsListening(false);
    addMessage('system', 'Stopped listening');
  };

  const status = isConnecting ? 'connecting' : isConnected ? 'connected' : 'disconnected';

  return (
    <div className="relative flex flex-col min-h-screen bg-transparent overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-secondary/40 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-accent/30 rounded-full animate-bounce"></div>

        {/* Data streams */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-pulse"></div>
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-secondary/20 to-transparent animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 sm:p-6 bg-background/10 backdrop-blur-sm border-b border-primary/20">
        <ChatStatusIndicator
          status={status}
          businessType={businessType}
        />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 relative z-10 px-4 sm:px-6 pb-4">
        <ChatMessages
          messages={messages}
          isAiTyping={isAiTyping}
        />
      </div>

      {/* Controls */}
      <div className="relative z-10 p-4 sm:p-6">
        <ChatControls
          isConnected={isConnected}
          isMuted={isMuted}
          isListening={isListening}
          onToggleMute={handleToggleMute}
          onEndDemo={onEndDemo}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
        />
      </div>
    </div>
  );
}
