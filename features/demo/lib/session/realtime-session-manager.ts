import { RealtimeSession, RealtimeAgent, OpenAIRealtimeWebRTC } from '@openai/agents/realtime';
import { SessionStatus, SessionConfig, TransportEvent, SessionCallbacks } from './types';
import { AgentManager } from '../agents/agent-manager';

export class RealtimeSessionManager {
  private session: RealtimeSession | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private agentManager: AgentManager;
  private status: SessionStatus = 'DISCONNECTED';
  private callbacks: SessionCallbacks;
  private isConnecting = false;

  constructor(agentManager: AgentManager, callbacks: SessionCallbacks = {}) {
    this.agentManager = agentManager;
    this.callbacks = callbacks;
  }

  async connect(config: SessionConfig, ephemeralKey: string): Promise<void> {
    if (this.session || this.isConnecting) {
      console.log('❌ [SessionManager] Already connecting/connected');
      return;
    }

    this.isConnecting = true;
    this.updateStatus('CONNECTING');

    try {
      // Create audio element
      if (!this.audioElement) {
        this.audioElement = document.createElement("audio");
        this.audioElement.autoplay = true;
        this.audioElement.controls = false;
        this.audioElement.style.display = 'none';
        document.body.appendChild(this.audioElement);
      }

      const rootAgent = this.agentManager.getCurrentAgent();

      // Create session using official SDK
      this.session = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement: this.audioElement,
        }),
        model: 'gpt-4o-realtime-preview-2025-06-03',
        config: {
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          inputAudioTranscription: {
            model: 'whisper-1',
          },
          turnDetection: {
            type: 'server_vad',
            threshold: 0.3,
            prefixPaddingMs: 100,
            silenceDurationMs: 100,
          },
        },
      });

      this.setupEventHandlers();

      await this.session.connect({ apiKey: ephemeralKey });
      this.isConnecting = false;
      this.updateStatus('CONNECTED');

    } catch (error) {
      console.error('❌ [SessionManager] Connection failed:', error);
      this.isConnecting = false;
      this.updateStatus('DISCONNECTED');
      this.callbacks.onError?.(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.session) return;

    this.session.on("error", (error: unknown) => {
      console.error('❌ [SessionManager] Session error:', error);
      this.callbacks.onError?.(error.message || 'Session error');
    });

    this.session.on("agent_handoff", (context: unknown, fromAgent: { name: string }, toAgent: { name: string }) => {
      const newAgent = this.agentManager.handoffToAgent(toAgent.name);
      if (newAgent) {
        this.callbacks.onAgentHandoff?.(fromAgent.name, toAgent.name);
      }
    });

    this.session.on("transport_event", (event: TransportEvent) => {
      this.handleTransportEvent(event);
    });
  }

  private handleTransportEvent(event: TransportEvent): void {
    // Debug: Log all events to see what we're receiving
    console.log('🔍 [SessionManager] Transport event:', event.type, event);

    switch (event.type) {
      // Audio streaming events
      case "input_audio_buffer.append":
        console.log('🎵 [SessionManager] Audio buffer append - user streaming audio');
        this.callbacks.onUserSpeaking?.(true);
        break;

      case "input_audio_buffer.speech_started":
        console.log('🎤 [SessionManager] User started speaking - create placeholder');
        this.callbacks.onUserSpeaking?.(true);
        // Create user message immediately when speech starts
        this.callbacks.onTranscriptDelta?.('🎤 Speaking...', true, event.item_id || 'temp');
        break;

      case "input_audio_buffer.speech_stopped":
        console.log('🎤 [SessionManager] User stopped speaking');
        this.callbacks.onUserSpeaking?.(false);
        break;

      // ONLY DELTA EVENTS FOR STREAMING
      case "conversation.item.input_audio_transcription.delta":
        console.log('📝 [SessionManager] USER delta:', event.delta);
        if (event.delta && event.item_id) {
          this.callbacks.onTranscriptDelta?.(event.delta, true, event.item_id);
        }
        break;

      case "response.output_audio_transcript.delta":
        console.log('🤖 [SessionManager] AI delta:', event.delta);
        if (event.delta && event.item_id) {
          this.callbacks.onTranscriptDelta?.(event.delta, false, event.item_id);
        }
        break;

      case "response.done":
        console.log('🤖 [SessionManager] AI response completed');
        this.callbacks.onAiThinking?.(false);
        break;
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
    this.session?.mute(muted);
  }

  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }

    if (this.audioElement && document.body.contains(this.audioElement)) {
      document.body.removeChild(this.audioElement);
      this.audioElement = null;
    }

    this.isConnecting = false;
    this.updateStatus('DISCONNECTED');
  }

  getCurrentAgent(): RealtimeAgent {
    return this.agentManager.getCurrentAgent();
  }
}
