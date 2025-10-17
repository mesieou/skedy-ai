import { useState, useEffect, useRef, useCallback } from 'react';
import { OnboardingSession } from '../lib/types/onboarding-session';

export interface RealtimeMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface RealtimeCallbacks {
  onStatusChange?: (status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED') => void;
  onTranscriptDelta?: (delta: string, isUser: boolean, itemId: string) => void;
  onUserSpeaking?: (speaking: boolean) => void;
  onAiThinking?: (thinking: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * Realtime Onboarding Hook
 * Uses OpenAI Realtime API for voice conversations during onboarding
 * Based on demo's realtime session manager
 */
export function useRealtimeOnboarding(session: OnboardingSession, callbacks: RealtimeCallbacks = {}) {
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const messageCounterRef = useRef(0);
  const streamingMessagesRef = useRef<Map<string, RealtimeMessage>>(new Map());

  const addMessage = useCallback((type: 'user' | 'assistant' | 'system', content: string) => {
    const message: RealtimeMessage = {
      id: `msg_${++messageCounterRef.current}`,
      type,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const updateStreamingMessage = useCallback((itemId: string, delta: string, isUser: boolean) => {
    const streamingMessages = streamingMessagesRef.current;

    if (streamingMessages.has(itemId)) {
      const existingMessage = streamingMessages.get(itemId)!;
      const updatedMessage = {
        ...existingMessage,
        content: existingMessage.content + delta
      };
      streamingMessages.set(itemId, updatedMessage);
      setMessages(prev => prev.map(msg => msg.id === existingMessage.id ? updatedMessage : msg));
    } else {
      const message: RealtimeMessage = {
        id: `stream_${itemId}`,
        type: isUser ? 'user' : 'assistant',
        content: delta,
        timestamp: Date.now(),
      };
      streamingMessages.set(itemId, message);
      setMessages(prev => [...prev, message]);
    }

    callbacks.onTranscriptDelta?.(delta, isUser, itemId);
  }, [callbacks]);

  const updateStatus = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    callbacks.onStatusChange?.(newStatus);
  }, [callbacks]);

  const connect = useCallback(async () => {
    if (peerConnectionRef.current) {
      console.log('❌ [Realtime] Already connected');
      return;
    }

    updateStatus('CONNECTING');
    addMessage('system', '🔗 Connecting to voice chat...');

    try {
      // Get ephemeral key from our API
      const response = await fetch(`/api/onboarding/realtime-session?sessionId=${session.id}`);
      if (!response.ok) {
        throw new Error('Failed to get session key');
      }

      const { value: ephemeralKey } = await response.json();

      // Create audio element
      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
        audioElementRef.current.autoplay = true;
        audioElementRef.current.controls = false;
        audioElementRef.current.style.display = 'none';
        document.body.appendChild(audioElementRef.current);
      }

      // Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Set up audio playback from OpenAI
      pc.ontrack = (e) => {
        console.log('🎵 [Realtime] Received audio track');
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track for microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        pc.addTrack(stream.getTracks()[0]);
        console.log('🎤 [Realtime] Microphone connected');
      } catch (micError) {
        console.error('❌ [Realtime] Microphone access denied:', micError);
        throw new Error('Microphone access required');
      }

      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log('✅ [Realtime] Data channel opened');
        updateStatus('CONNECTED');
        addMessage('system', '🎤 Connected! Start speaking...');
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerEvent(msg);
        } catch (error) {
          console.error('❌ [Realtime] Failed to parse message:', error);
        }
      };

      dc.onerror = (error) => {
        console.error('❌ [Realtime] Data channel error:', error);
        callbacks.onError?.('Connection error');
      };

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to OpenAI');
      }

      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);
      console.log('✅ [Realtime] WebRTC connection established');

    } catch (error) {
      console.error('❌ [Realtime] Connection failed:', error);
      addMessage('system', `❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      updateStatus('DISCONNECTED');
      disconnect();
    }
  }, [session.id, addMessage, updateStatus, callbacks]);

  const disconnect = useCallback((silent = false) => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }

    if (!silent) {
      updateStatus('DISCONNECTED');
      addMessage('system', '🔌 Disconnected');
    }
  }, [addMessage, updateStatus]);

  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        addMessage('system', isMuted ? '🎤 Microphone unmuted' : '🔇 Microphone muted');
      }
    }
  }, [isMuted, addMessage]);

  const handleServerEvent = (event: any) => {
    switch (event.type) {
      case 'response.audio_transcript.delta':
        updateStreamingMessage(event.item_id, event.delta, false);
        setIsAiThinking(true);
        callbacks.onAiThinking?.(true);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        updateStreamingMessage(event.item_id, event.transcript, true);
        setIsUserSpeaking(false);
        callbacks.onUserSpeaking?.(false);
        break;

      case 'input_audio_buffer.speech_started':
        setIsUserSpeaking(true);
        callbacks.onUserSpeaking?.(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsUserSpeaking(false);
        callbacks.onUserSpeaking?.(false);
        break;

      case 'response.done':
        setIsAiThinking(false);
        callbacks.onAiThinking?.(false);
        break;

      case 'error':
        console.error('❌ [Realtime] Server error:', event.error);
        callbacks.onError?.(event.error?.message || 'Unknown error');
        break;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect(true); // Silent disconnect on unmount
    };
  }, [disconnect]);

  return {
    status,
    messages,
    isMuted,
    isUserSpeaking,
    isAiThinking,
    connect,
    disconnect,
    toggleMute,
  };
}
