/**
 * MVP Voice Webhook Handler - Token Optimized
 *
 * Orchestrates the complete MVP voice agent system:
 * - Knowledge preloading into Redis
 * - Minimal prompt generation
 * - Optimized WebSocket coordination
 * - Multi-tenant business support
 */

// Define WebhookEvent locally since it's not exported
interface WebhookEvent {
  id: string;
  object: string;
  created_at: number;
  type: string;
  data: {
    call_id: string;
    sip_headers?: Array<{
      name: string;
      value: string;
    }>;
    [key: string]: unknown;
  };
}
import { businessContextProvider } from '../../shared/lib/database/business-context-provider';
import { MVPCallContextManager } from '../memory/mvp-call-context-manager';
import { MVPToolsManager } from '../tools/mvp-tools-manager';
import { MVPWebSocketCoordinator } from './mvp-websocket-coordinator';
import { CallService } from './call-service';
import { createCallAcceptConfig } from './config';
import { MVPPromptBuilder } from '../intelligence/prompt-builder-mvp';
import { KnowledgeCacheManager } from '../memory/redis/knowledge-cache-manager';
import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { CallContextManager } from '../memory/call-context-manager';
import { type VoiceEventBus } from '../memory/redis/event-bus';
import { agentServiceContainer } from '../memory/service-container';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface WebhookHandlerOptions {
  skipCallAccept?: boolean;
  customInstructions?: string;
}

interface MVPVoiceConfig {
  model: string;
  voice: string;
  maxOutputTokens: number;
  enableConversationTruncation: boolean;
}

// ============================================================================
// MVP VOICE WEBHOOK HANDLER
// ============================================================================

export class MVPVoiceWebhookHandler {
  private readonly callService: CallService;
  private voiceEventBus: VoiceEventBus | null = null;
  private mvpCallContextManager: MVPCallContextManager | null = null;
  private mvpWebSocketCoordinator: MVPWebSocketCoordinator | null = null;
  private readonly config: MVPVoiceConfig;

  constructor() {
    this.callService = new CallService(process.env.OPENAI_API_KEY!);

    // MVP Configuration
    this.config = {
      model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2025-08-28",
      voice: process.env.OPENAI_VOICE || "marin",
      maxOutputTokens: parseInt(process.env.MVP_MAX_OUTPUT_TOKENS || "120"),
      enableConversationTruncation: process.env.MVP_ENABLE_TRUNCATION !== 'false'
    };

    console.log('🔧 [MVP Webhook] Initialized with config:', this.config);
  }

  // ============================================================================
  // MAIN CALL PROCESSING
  // ============================================================================

  async handleIncomingCallWithValidation(event: WebhookEvent): Promise<{ success: boolean; error?: string }> {
    const callId = event.data.call_id;
    console.log(`📞 [MVP Webhook] Handling incoming call with validation: ${callId}`);

    try {
      // 🛡️ CALL STATE VALIDATION - Check if already processing
      const { voiceRedisClient } = await import('@/features/agent/memory/redis');
      const existingState = await voiceRedisClient.get(`call:${callId}:state`);

      if (existingState) {
        const state = JSON.parse(existingState);
        if (state.status === 'active' || state.status === 'processing') {
          console.log(`🔄 [MVP Webhook] Call ${callId} already being processed (status: ${state.status})`);
          return { success: true }; // Return success for idempotency
        }
      }

      // Mark call as processing to prevent race conditions
      await voiceRedisClient.set(`call:${callId}:processing`, JSON.stringify({
        status: 'processing',
        timestamp: new Date().toISOString()
      }), 60);

      await this.handleIncomingCall(event);

      // Clean up processing flag
      await voiceRedisClient.del(`call:${callId}:processing`);

      return { success: true };

    } catch (error) {
      console.error(`❌ [MVP Webhook] Failed to handle incoming call ${callId}:`, error);

      // Clean up processing flag on error
      try {
        const { voiceRedisClient } = await import('@/features/agent/memory/redis');
        await voiceRedisClient.del(`call:${callId}:processing`);
      } catch (cleanupError) {
        console.error('❌ Failed to clean up call processing flag:', cleanupError);
      }

      // Determine if this is a recoverable error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRecoverable = errorMessage.includes('No session found') ||
                           errorMessage.includes('call_id_not_found') ||
                           errorMessage.includes('endpoints failed');

      if (isRecoverable) {
        console.log(`🔄 [MVP Webhook] Treating as recoverable error for call ${callId}`);
        return { success: true, error: 'Call expired or invalid - handled gracefully' };
      }

      return { success: false, error: errorMessage };
    }
  }

  async handleIncomingCall(
    event: WebhookEvent,
    options: WebhookHandlerOptions = {}
  ): Promise<void> {
    const callId = event.data.call_id;

    try {
      console.log(`📞 [MVP Webhook] Handling incoming call: ${callId}`);

      // 0. Initialize service container if needed
      if (!this.voiceEventBus) {
        await agentServiceContainer.initialize();
        this.voiceEventBus = agentServiceContainer.getVoiceEventBus();
      }

      // 1. Extract and validate call data
      const callData = await this.extractAndValidateCallData(event);

      // 2. Get business context with knowledge
      const { businessContext, businessEntity } = await businessContextProvider.getBusinessDataByTwilioSid(callData.twilioAccountSid);

      console.log(`🏢 [MVP Webhook] Business: ${businessEntity.name} (${businessEntity.id})`);

      // 3. Initialize MVP call context manager
      this.mvpCallContextManager = new MVPCallContextManager(this.voiceEventBus!);

      // 4. Initialize call context (focused responsibility)
      await this.mvpCallContextManager.initializeCall({
        callId,
        businessId: businessEntity.id,
        userId: null, // User creation handled by AI tools
        phoneNumber: callData.phoneNumber,
        business: businessEntity
      });

      // 5. PRELOAD BUSINESS KNOWLEDGE INTO REDIS (webhook handler responsibility)
      await KnowledgeCacheManager.preloadBusinessKnowledge(callId, businessContext);

      // 5. Setup MVP tools manager
      const mvpToolsManager = new MVPToolsManager(
        businessContext,
        businessEntity,
        this.mvpCallContextManager as unknown as CallContextManager,
        callId
      );

      // 6. Generate minimal MVP instructions
      const aiInstructions = this.generateMVPInstructions(businessContext);

      // 7. Setup MVP WebSocket coordinator
      this.mvpWebSocketCoordinator = new MVPWebSocketCoordinator(
        this.mvpCallContextManager,
        this.voiceEventBus!,
        mvpToolsManager,
        {
          maxOutputTokens: this.config.maxOutputTokens,
          enableTruncation: this.config.enableConversationTruncation
        }
      );

      // 8. Accept call with MVP configuration
      await this.acceptCall(callId, aiInstructions, options);

      // 9. Start MVP WebSocket coordination
      await this.mvpWebSocketCoordinator.startCallSession({
        callId,
        businessId: businessEntity.id,
        initialInstructions: aiInstructions
      });

      console.log(`✅ [MVP Webhook] Call setup complete: ${callId}`);

    } catch (error) {
      console.error(`❌ [MVP Webhook] Failed to handle incoming call ${callId}:`, error);

      // Cleanup on error
      if (this.mvpCallContextManager) {
        await this.mvpCallContextManager.completeCall(callId, 'error');
      }

      throw error;
    }
  }

  // ============================================================================
  // CALL DATA EXTRACTION
  // ============================================================================

  private async extractAndValidateCallData(event: WebhookEvent): Promise<{
    callId: string;
    twilioAccountSid: string;
    phoneNumber: string;
  }> {
    const callId = event.data.call_id;
    const sipHeaders = event.data.sip_headers || [];

    // Extract Twilio Account SID
    const twilioAccountSid = this.extractTwilioAccountSid(sipHeaders);
    if (!twilioAccountSid) {
      throw new Error('Missing Twilio Account SID in webhook');
    }

    // Extract caller phone number
    const phoneNumber = this.extractPhoneNumber(sipHeaders);
    if (!phoneNumber) {
      throw new Error('Missing phone number in webhook');
    }

    console.log(`📋 [MVP Webhook] Call data: ${callId} from ${phoneNumber} via ${twilioAccountSid}`);

    return {
      callId,
      twilioAccountSid,
      phoneNumber
    };
  }

  private extractTwilioAccountSid(sipHeaders: Array<{name: string; value: string}>): string | null {
    const header = sipHeaders.find(h => h.name === 'X-Twilio-AccountSid');
    return header?.value || null;
  }

  private extractPhoneNumber(sipHeaders: Array<{name: string; value: string}>): string | null {
    const phoneHeaders = ['From', 'X-Twilio-From', 'Remote-Party-ID', 'P-Asserted-Identity'];

    for (const headerName of phoneHeaders) {
      const header = sipHeaders.find(h => h.name === headerName);
      if (header?.value) {
        // Extract phone number from various formats
        const phoneMatch = header.value.match(/([+]?[\d\-\(\)\s]+)/);
        if (phoneMatch) {
          return phoneMatch[1].replace(/[\s\-\(\)]/g, ''); // Clean up formatting
        }
      }
    }

    return null;
  }

  // ============================================================================
  // MVP INSTRUCTION GENERATION
  // ============================================================================

  private generateMVPInstructions(businessContext: BusinessContext): string {
    console.log(`🤖 [MVP Webhook] Generating minimal instructions for ${businessContext.businessInfo.name}`);

    // Check if returning customer (simplified check)
    const userContext = null; // Could implement user lookup here

    const instructions = MVPPromptBuilder.buildPrompt(businessContext, {
      userContext,
      customInstructions: this.buildConciseInstructions()
    });

    console.log(`📏 [MVP Webhook] Generated instructions: ~${Math.round(instructions.length / 4)} tokens`);

    return instructions;
  }

  private buildConciseInstructions(): string {
    return `
RESPONSE STYLE:
- Maximum 2 sentences per response
- Be direct and helpful
- No rambling or unnecessary details
- Ask one question at a time
- Confirm information before proceeding

TOKEN OPTIMIZATION:
- Keep responses under ${this.config.maxOutputTokens} tokens
- Use concise language
- Summarize context when needed`.trim();
  }

  // ============================================================================
  // CALL ACCEPTANCE
  // ============================================================================

  private async acceptCall(callId: string, instructions: string, options: WebhookHandlerOptions): Promise<void> {
    if (options.skipCallAccept) {
      console.log(`⏭️ [MVP Webhook] Skipping call acceptance for: ${callId}`);
      return;
    }

    const callConfig = createCallAcceptConfig(
      instructions,
      this.config.model,
      this.config.voice
    );

    console.log(`📞 [MVP Webhook] Accepting call: ${callId}`);
    console.log(`🎙️ [MVP Webhook] Model: ${this.config.model}, Voice: ${this.config.voice}, Max tokens: ${this.config.maxOutputTokens}`);

    const acceptResult = await this.callService.acceptCall(callId, callConfig);

    if (!acceptResult.success) {
      throw new Error(acceptResult.error || 'MVP call accept failed');
    }

    console.log(`✅ [MVP Webhook] Call accepted: ${callId}`);
  }

  // ============================================================================
  // CLEANUP & ERROR HANDLING
  // ============================================================================

  async handleCallEnd(callId: string, reason: 'completed' | 'ended' | 'error' = 'ended'): Promise<void> {
    try {
      console.log(`🏁 [MVP Webhook] Handling call end: ${callId} (${reason})`);

      // Complete call context
      if (this.mvpCallContextManager) {
        await this.mvpCallContextManager.completeCall(callId, reason);
      }

      // Stop WebSocket coordination
      if (this.mvpWebSocketCoordinator) {
        await this.mvpWebSocketCoordinator.stopCallSession(callId);
      }

      // Clean up knowledge data from Redis (webhook handler responsibility)
      await KnowledgeCacheManager.cleanupCallKnowledge(callId);

      console.log(`✅ [MVP Webhook] Call cleanup complete: ${callId}`);

    } catch (error) {
      console.error(`❌ [MVP Webhook] Error during call cleanup ${callId}:`, error);
    }
  }

  // ============================================================================
  // HEALTH & DIAGNOSTICS
  // ============================================================================

  async getCallStatus(callId: string): Promise<{
    status: string;
    tokenUsage?: { total: number; rate: number };
        lastActivity?: Date;
  } | null> {
    try {
      if (!this.mvpCallContextManager) {
        return null;
      }

      const context = await this.mvpCallContextManager.getCallContext(callId);
      if (!context) {
        return null;
      }

      const stats = await this.mvpCallContextManager.getCallStats(callId);

      return {
        status: context.status,
        tokenUsage: stats ? {
          total: stats.messageCount * 100, // Rough estimate
          rate: stats.duration > 0 ? Math.round((stats.messageCount * 100) / stats.duration) : 0
        } : undefined,
        lastActivity: this.mvpWebSocketCoordinator?.getCallActivity(callId) || undefined
      };

    } catch (error) {
      console.error(`❌ [MVP Webhook] Error getting call status ${callId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  getConfig(): MVPVoiceConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MVPVoiceConfig>): void {
    Object.assign(this.config, updates);
    console.log(`🔧 [MVP Webhook] Config updated:`, updates);
  }
}
