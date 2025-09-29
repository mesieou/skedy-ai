import { SessionStatus, SessionConfig, SessionCallbacks } from './types';
import { AgentBridge } from '../services/agent-bridge';
import * as Sentry from '@sentry/nextjs';
import { sentry } from '@/features/shared/utils/sentryService';
import { createWebRTCSessionConfig, createSessionUpdateConfig } from '@/features/shared/lib/openai-realtime-config';

// Increase max listeners to prevent memory leak warnings (Node.js only)
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(20);
}

export class RealtimeSessionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null; // Track microphone stream
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
    Sentry.addBreadcrumb({
      message: 'Demo WebRTC connection started',
      category: 'demo-webrtc',
      data: {
        sessionId: backendSessionId || 'unknown',
        hasBackendSession: !!backendSession,
        tradieType: config.tradieType?.id || 'unknown'
      }
    });

    // Store backend session data for tool execution and interaction tracking
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
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.peerConnection.addTrack(this.mediaStream.getTracks()[0]);

        // Track successful microphone access
        sentry.addBreadcrumb('Microphone access granted', 'demo-microphone', {
          sessionId: this.backendSessionId,
          tracksCount: this.mediaStream.getTracks().length
        });

        console.log('🎤 [SessionManager] Microphone access granted and track added');
      } catch (micError) {
        console.error('❌ [SessionManager] Failed to access microphone:', micError);
        sentry.trackError(micError as Error, {
          sessionId: this.backendSessionId || 'unknown',
          operation: 'microphone_access_denied'
        });
        throw new Error(`Microphone access denied: ${(micError as Error).message}`);
      }

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
      Sentry.addBreadcrumb({
        message: 'Demo WebRTC connection established',
        category: 'demo-webrtc',
        data: {
          sessionId: this.backendSessionId || 'unknown',
          toolsCount: (this.backendSession?.currentTools as unknown[])?.length || 0
        }
      });

      this.isConnecting = false;
      this.updateStatus('CONNECTED');

    } catch (error) {
      console.error('❌ [SessionManager] Connection failed:', error);

      // Track connection error in Sentry
      Sentry.captureException(error, {
        tags: {
          operation: 'demo_webrtc_connection',
          sessionId: this.backendSessionId || 'unknown'
        },
        extra: {
          tradieType: config.tradieType?.id || 'unknown',
          hasEphemeralKey: !!ephemeralKey
        }
      });

      this.isConnecting = false;
      this.updateStatus('DISCONNECTED');
      this.callbacks.onError?.(error instanceof Error ? error.message : String(error));

      // Capture connection error in Sentry
      sentry.trackError(error as Error, {
        sessionId: this.backendSessionId || 'unknown',
        operation: 'demo_connection_failed'
      });

      throw error;
    }
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.addEventListener("open", () => {
      console.log('✅ [SessionManager] Data channel opened - ready to send/receive events');

      // Send session.update with backend session configuration using shared config
      const tools = (this.backendSession?.currentTools as Record<string, unknown>[])?.map(tool => tool.function_schema) || [];
      const instructions = (this.backendSession?.aiInstructions as string) || 'You are a helpful assistant.';

      const sessionUpdate = createWebRTCSessionConfig(tools, instructions);

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
      sentry.trackError(new Error(`Data channel error: ${error}`), {
        sessionId: this.backendSessionId || 'unknown',
        operation: 'data_channel_error'
      });
      this.callbacks.onError?.('Data channel error');
    });

    // Listen for server events from OpenAI
    this.dataChannel.addEventListener("message", async (e) => {
      try {
        const event = JSON.parse(e.data);
        await this.handleRealtimeEvent(event);
      } catch (error) {
        console.error('❌ [SessionManager] Failed to parse event:', error);
        sentry.trackError(error as Error, {
          sessionId: this.backendSessionId || 'unknown',
          operation: 'realtime_event_parse_failed',
          metadata: { rawEventData: e.data }
        });
      }
    });
  }

  private async handleRealtimeEvent(event: Record<string, unknown>): Promise<void> {
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

      case "conversation.item.input_audio_transcription.completed":
        // Store user transcript via API to avoid client-side imports
        if (this.backendSessionId && event.transcript) {
          this.storeTranscriptViaAPI('user', event.transcript as string, event.item_id as string);
        }
        break;

      case "response.output_audio_transcript.delta":
        if (event.delta && event.item_id) {
          this.callbacks.onTranscriptDelta?.(event.delta as string, false, event.item_id as string);
        }
        break;

      case "response.output_audio_transcript.done":
        // Store AI transcript via API to avoid client-side imports
        if (this.backendSessionId && event.transcript) {
          this.storeTranscriptViaAPI('ai', event.transcript as string, event.item_id as string);
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

      // Track tool execution error
      sentry.trackError(error as Error, {
        sessionId: this.backendSessionId || 'unknown',
        operation: 'demo_tool_execution_failed',
        metadata: {
          toolName,
          callId,
          argsString: argsString.substring(0, 500) // Limit args length for Sentry
        }
      });

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

        // Send session.update event via data channel using shared config
        const tools = updatedTools.map((tool: Record<string, unknown>) => tool.function_schema);
        const sessionUpdate = createSessionUpdateConfig(tools);

        this.dataChannel.send(JSON.stringify(sessionUpdate));

        console.log('✅ [SessionManager] Session updated with new tools via data channel:', updatedTools.map((t: Record<string, unknown>) => t.name));
      }
    } catch (error) {
      console.error('❌ [SessionManager] Failed to update session with new tools:', error);
      sentry.trackError(error as Error, {
        sessionId: this.backendSessionId || 'unknown',
        operation: 'session_tools_update_failed'
      });
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
      sentry.trackError(error as Error, {
        sessionId: this.backendSessionId || 'unknown',
        operation: 'tool_result_send_failed',
        metadata: { callId, resultSuccess: result.success }
      });
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
    console.log('🔌 [SessionManager] Starting disconnect cleanup...');

    // Add Sentry breadcrumb for disconnect
    sentry.addBreadcrumb('Demo session disconnect initiated', 'demo-disconnect', {
      sessionId: this.backendSessionId,
      status: this.status
    });

    // Clean up backend session first
    this.cleanupBackendSession();

    // CRITICAL: Stop microphone stream and release permissions
    if (this.mediaStream) {
      console.log('🎤 [SessionManager] Stopping microphone stream...');
      try {
        const tracksCount = this.mediaStream.getTracks().length;
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 [SessionManager] Stopped track: ${track.kind} (${track.label})`);
        });
        this.mediaStream = null;
        console.log('✅ [SessionManager] Microphone stream stopped and permissions released');

        // Track successful microphone cleanup
        sentry.addBreadcrumb('Microphone stream stopped successfully', 'demo-cleanup', {
          sessionId: this.backendSessionId,
          tracksCount
        });
      } catch (error) {
        console.error('❌ [SessionManager] Error stopping microphone stream:', error);
        sentry.trackError(error as Error, {
          sessionId: this.backendSessionId || 'unknown',
          operation: 'microphone_cleanup_failed'
        });
        this.mediaStream = null; // Still clear the reference
      }
    }

    // Clean up WebRTC connections
    if (this.peerConnection) {
      console.log('🔌 [SessionManager] Closing peer connection...');
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.dataChannel) {
      console.log('📡 [SessionManager] Closing data channel...');
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.audioElement && document.body.contains(this.audioElement)) {
      console.log('🔊 [SessionManager] Removing audio element...');
      document.body.removeChild(this.audioElement);
      this.audioElement = null;
    }

    this.isConnecting = false;
    this.updateStatus('DISCONNECTED');
    console.log('✅ [SessionManager] Disconnect cleanup complete');
  }

  private async cleanupBackendSession(): Promise<void> {
    if (!this.backendSessionId) {
      console.log('🔄 [SessionManager] No backend session to cleanup');
      return;
    }

    try {
      console.log(`🧹 [SessionManager] Cleaning up backend session: ${this.backendSessionId}`);

      // Add breadcrumb for session cleanup
      Sentry.addBreadcrumb({
        message: 'Demo session cleanup started',
        category: 'demo-cleanup',
        data: {
          sessionId: this.backendSessionId
        }
      });

      // Call backend to end the session (similar to backend connectionHandlers)
      const response = await fetch('/api/demo-tool-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.backendSessionId,
          toolName: 'end_session', // We'll need to create this endpoint
          args: {}
        })
      });

      if (response.ok) {
        console.log(`✅ [SessionManager] Backend session ${this.backendSessionId} cleaned up successfully`);
        Sentry.addBreadcrumb({
          message: 'Demo session cleanup completed',
          category: 'demo-cleanup',
          data: {
            sessionId: this.backendSessionId
          }
        });
      } else {
        const errorMsg = `Failed to cleanup backend session: ${response.status}`;
        console.warn(`⚠️ [SessionManager] ${errorMsg}`);
        sentry.trackError(new Error(errorMsg), {
          sessionId: this.backendSessionId || 'unknown',
          operation: 'backend_session_cleanup_failed',
          metadata: { httpStatus: response.status }
        });
      }

    } catch (error) {
      console.error(`❌ [SessionManager] Error cleaning up backend session:`, error);

      // Track cleanup error in Sentry
      Sentry.captureException(error, {
        tags: {
          operation: 'demo_session_cleanup',
          sessionId: this.backendSessionId || 'unknown'
        },
        extra: {
          backendSessionId: this.backendSessionId
        }
      });
    } finally {
      // Clear references regardless of cleanup success
      this.backendSessionId = null;
      this.backendSession = null;
    }
  }

  private async storeTranscriptViaAPI(type: 'user' | 'ai', transcript: string, itemId: string): Promise<void> {
    if (!this.backendSessionId) return;

    try {
      // Store transcript via API to avoid client-side imports
      const response = await fetch('/api/demo-tool-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.backendSessionId,
          toolName: 'store_transcript',
          args: {
            type: type,
            transcript: transcript,
            itemId: itemId
          }
        })
      });

      if (response.ok) {
        console.log(`✅ [SessionManager] ${type} transcript stored via API`);
      } else {
        const errorMsg = `Failed to store ${type} transcript: ${response.status}`;
        console.warn(`⚠️ [SessionManager] ${errorMsg}`);
        sentry.trackError(new Error(errorMsg), {
          sessionId: this.backendSessionId || 'unknown',
          operation: 'transcript_api_failed',
          metadata: {
            transcriptType: type,
            httpStatus: response.status,
            itemId
          }
        });
      }

    } catch (error) {
      console.error(`❌ [SessionManager] Error storing ${type} transcript:`, error);
      sentry.trackError(error as Error, {
        sessionId: this.backendSessionId || 'unknown',
        operation: 'transcript_storage_failed',
        metadata: {
          transcriptType: type,
          itemId,
          transcriptLength: transcript.length
        }
      });
    }
  }

  getCurrentAgent(): { name: string; id: string } {
    // Return simple agent info since we're using backend agents
    return { name: 'Backend Agent', id: 'backend' };
  }
}
