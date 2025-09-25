import { SessionStatus, SessionConfig, SessionCallbacks } from './types';
import { AgentBridge } from '../services/agent-bridge';
import { sentry } from '@/features/shared/utils/sentryService';

// Increase max listeners to prevent memory leak warnings (Node.js only)
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(20);
}

export class RealtimeSessionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private status: SessionStatus = 'DISCONNECTED';
  private callbacks: SessionCallbacks;
  private isConnecting = false;
  private backendSessionId: string | null = null;
  private backendSession: Record<string, unknown> | null = null;

  constructor(callbacks: SessionCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async connect(config: SessionConfig, ephemeralKey: string, backendSessionId?: string, backendSession?: Record<string, unknown>): Promise<void> {
    if (this.peerConnection || this.isConnecting) {
      console.log('❌ [SessionManager] Already connecting/connected');
      return;
    }

    this.isConnecting = true;
    this.updateStatus('CONNECTING');

    // Add breadcrumb for WebRTC connection start
    sentry.addBreadcrumb('Demo WebRTC connection started', 'demo-webrtc', {
      sessionId: backendSessionId || 'unknown',
      hasBackendSession: !!backendSession,
      tradieType: config.tradieType?.id || 'unknown'
    });

    // Store backend session data for tool execution
    this.backendSessionId = backendSessionId || null;
    this.backendSession = backendSession || null;
    console.log('🔗 [SessionManager] Backend session ID:', this.backendSessionId);

    const currentTools = (this.backendSession?.currentTools as Record<string, unknown>[]) || [];
    const businessEntity = this.backendSession?.businessEntity as Record<string, unknown>;
    console.log('🔧 [SessionManager] Backend session data:', {
      hasSession: !!backendSession,
      toolsCount: currentTools.length,
      toolNames: currentTools.map((t: Record<string, unknown>) => t.name) || [],
      hasInstructions: !!backendSession?.aiInstructions,
      businessName: businessEntity?.name
    });

    try {
      // Create audio element
      if (!this.audioElement) {
        this.audioElement = document.createElement("audio");
        this.audioElement.autoplay = true;
        this.audioElement.controls = false;
        this.audioElement.style.display = 'none';
        document.body.appendChild(this.audioElement);
      }

      // Create WebRTC peer connection
      this.peerConnection = new RTCPeerConnection();

      // Set up audio playback from OpenAI
      this.peerConnection.ontrack = (e) => {
        console.log('🎵 [SessionManager] Received audio track from OpenAI:', e.streams[0]);
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
          console.log('🔊 [SessionManager] Audio element connected to stream');
        }
      };

      // Add local audio track for microphone input
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.peerConnection.addTrack(mediaStream.getTracks()[0]);

      // Set up data channel for events
      this.dataChannel = this.peerConnection.createDataChannel("oai-events");
      this.setupDataChannelHandlers();

      // Create offer and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send SDP to OpenAI using ephemeral token approach (simpler)
      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const answerSdp = await response.text();
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: answerSdp,
      };

      await this.peerConnection.setRemoteDescription(answer);

      console.log('✅ [SessionManager] WebRTC connection established with backend tools');

      // Add breadcrumb for successful connection
      sentry.addBreadcrumb('Demo WebRTC connection established', 'demo-webrtc', {
        sessionId: this.backendSessionId || 'unknown',
        toolsCount: (this.backendSession?.currentTools as unknown[])?.length || 0
      });

      this.isConnecting = false;
      this.updateStatus('CONNECTED');

    } catch (error) {
      console.error('❌ [SessionManager] Connection failed:', error);

      // Track connection error in Sentry
      sentry.trackError(error as Error, {
        sessionId: this.backendSessionId || 'unknown',
        businessId: 'unknown',
        operation: 'demo_webrtc_connection',
        metadata: {
          tradieType: config.tradieType?.id || 'unknown',
          hasEphemeralKey: !!ephemeralKey
        }
      });

      this.isConnecting = false;
      this.updateStatus('DISCONNECTED');
      this.callbacks.onError?.(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.addEventListener("open", () => {
      console.log('✅ [SessionManager] Data channel opened - ready to send/receive events');

      // Send session.update with backend session configuration
      const sessionUpdate = {
        type: "session.update",
        session: {
          type: "realtime",
          model: "gpt-realtime",
          output_modalities: ["audio"],
          audio: {
            input: {
              format: {
                type: "audio/pcm",
                rate: 24000,
              },
              turn_detection: {
                type: "semantic_vad"
              }
            },
            output: {
              format: {
                type: "audio/pcm",
              },
              voice: "alloy",
            }
          },
          // Add tools from backend session
          tools: (this.backendSession?.currentTools as Record<string, unknown>[])?.map(tool => tool.function_schema) || [],
          tool_choice: "auto",
          // Add instructions from backend session
          instructions: (this.backendSession?.aiInstructions as string) || 'You are a helpful assistant.'
        }
      };

      this.dataChannel!.send(JSON.stringify(sessionUpdate));
      console.log('🔄 [SessionManager] Sent session.update with backend tools and instructions');

      // Then send initial response request to start conversation
      setTimeout(() => {
        const responseRequest = {
          type: "response.create"
        };
        this.dataChannel!.send(JSON.stringify(responseRequest));
        console.log('🔄 [SessionManager] Sent initial response request');
      }, 1000);
    });

    this.dataChannel.addEventListener("error", (error) => {
      console.error('❌ [SessionManager] Data channel error:', error);
      this.callbacks.onError?.('Data channel error');
    });

    // Listen for server events from OpenAI
    this.dataChannel.addEventListener("message", (e) => {
      try {
        const event = JSON.parse(e.data);
        this.handleRealtimeEvent(event);
      } catch (error) {
        console.error('❌ [SessionManager] Failed to parse event:', error);
      }
    });
  }

  private handleRealtimeEvent(event: Record<string, unknown>): void {
    console.log('🔍 [SessionManager] Realtime event:', event.type);

    // Log important events with more detail
    if (['session.created', 'session.updated', 'response.done', 'error'].includes(event.type as string)) {
      console.log('📋 [SessionManager] Important event details:', event);
    }

    switch (event.type) {
      // Audio streaming events
      case "input_audio_buffer.append":
        this.callbacks.onUserSpeaking?.(true);
        break;

      case "input_audio_buffer.speech_started":
        this.callbacks.onUserSpeaking?.(true);
        // Create user message immediately when speech starts
        this.callbacks.onTranscriptDelta?.('🎤 Speaking...', true, (event.item_id as string) || 'temp');
        break;

      case "input_audio_buffer.speech_stopped":
        this.callbacks.onUserSpeaking?.(false);
        break;

      // ONLY DELTA EVENTS FOR STREAMING
      case "conversation.item.input_audio_transcription.delta":
        if (event.delta && event.item_id) {
          this.callbacks.onTranscriptDelta?.(event.delta as string, true, event.item_id as string);
        }
        break;

      case "response.output_audio_transcript.delta":
        if (event.delta && event.item_id) {
          this.callbacks.onTranscriptDelta?.(event.delta as string, false, event.item_id as string);
        }
        break;

      case "response.done":
        console.log('🤖 [SessionManager] AI response completed');
        this.callbacks.onAiThinking?.(false);
        break;

      // Tool execution events
      case "response.function_call_arguments.done":
        console.log('🔧 [SessionManager] Function call arguments done:', event);
        if (event.name && event.arguments && this.backendSessionId) {
          this.handleToolExecution(event.name as string, event.arguments as string, event.call_id as string);
        }
        break;
    }
  }

  private async handleToolExecution(toolName: string, argsString: string, callId?: string): Promise<void> {
    if (!this.backendSessionId) {
      console.error('❌ [SessionManager] No backend session ID for tool execution');
      return;
    }

    try {
      console.log(`🔧 [SessionManager] BEFORE tool execution:`, {
        toolName,
        backendSessionId: this.backendSessionId,
        callId,
        argsString
      });
      this.callbacks.onToolExecution?.(toolName);

      // Parse arguments
      const args = JSON.parse(argsString);

      // Execute tool using agent backend system
      const result = await AgentBridge.executeTool(this.backendSessionId, toolName, args);

      console.log(`📤 [SessionManager] Tool result:`, result);
      this.callbacks.onToolResult?.(toolName, result, true);

      // If this was request_tool, update the session with new tools (same as backend agent)
      if (toolName === 'request_tool' && result.success) {
        console.log('🔧 [SessionManager] request_tool executed, updating session with new tools...');
        await this.updateSessionWithNewTools();
      }

      // Send result back to OpenAI session if we have a call ID
      if (callId && this.dataChannel) {
        await this.sendToolResult(callId, result);
      }

    } catch (error) {
      console.error(`❌ [SessionManager] Tool execution failed:`, error);
      this.callbacks.onError?.(`Tool execution failed: ${error}`);

      // Send error result back to OpenAI if we have a call ID
      if (callId && this.dataChannel) {
        await this.sendToolResult(callId, {
          success: false,
          error: `Tool execution failed: ${error}`
        });
      }
    }
  }

  private async updateSessionWithNewTools(): Promise<void> {
    if (!this.backendSessionId || !this.dataChannel) return;

    try {
      // Get updated session data from backend
      const response = await fetch(`/api/demo-tool-execution?sessionId=${this.backendSessionId}&action=getSession`);
      const sessionData = await response.json();

      if (sessionData.success && sessionData.session) {
        const updatedTools = (sessionData.session.currentTools as Record<string, unknown>[]) || [];
        console.log('🔧 [SessionManager] Sending session.update with new tools:', updatedTools.map((t: Record<string, unknown>) => t.name));

        // Send session.update event via data channel (same as backend updateOpenAiSession)
        const sessionUpdate = {
          type: "session.update",
          session: {
            type: "realtime",
            tools: updatedTools.map((tool: Record<string, unknown>) => tool.function_schema),
            tool_choice: "auto"
          },
          event_id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        };

        this.dataChannel.send(JSON.stringify(sessionUpdate));

        console.log('✅ [SessionManager] Session updated with new tools via data channel:', updatedTools.map((t: Record<string, unknown>) => t.name));
      }
    } catch (error) {
      console.error('❌ [SessionManager] Failed to update session with new tools:', error);
    }
  }

  private async sendToolResult(callId: string, result: Record<string, unknown>): Promise<void> {
    if (!this.dataChannel) return;

    try {
      // Send function result back to OpenAI via data channel
      const functionResult = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result)
        }
      };

      this.dataChannel.send(JSON.stringify(functionResult));
      console.log('📤 [SessionManager] Sent tool result via data channel');

      // Request new response after sending tool result
      const responseRequest = {
        type: "response.create"
      };

      this.dataChannel.send(JSON.stringify(responseRequest));
      console.log('🔄 [SessionManager] Requested AI response after tool execution');

    } catch (error) {
      console.error('❌ [SessionManager] Failed to send tool result:', error);
    }
  }

  private updateStatus(newStatus: SessionStatus): void {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  mute(muted: boolean): void {
    // TODO: Implement muting via WebRTC
    console.log('🔇 [SessionManager] Mute not implemented for WebRTC yet:', muted);
  }

  disconnect(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.audioElement && document.body.contains(this.audioElement)) {
      document.body.removeChild(this.audioElement);
      this.audioElement = null;
    }

    this.isConnecting = false;
    this.updateStatus('DISCONNECTED');
  }

  getCurrentAgent(): { name: string; id: string } {
    // Return simple agent info since we're using backend agents
    return { name: 'Backend Agent', id: 'backend' };
  }
}
