/**
 * Voice Webhook Handler (New Architecture)
 *
 * Thin orchestrator that coordinates services:
 * - SIP processing and call acceptance
 * - Event-driven service coordination
 * - Dependency injection for testability
 * - Clean separation of concerns
 */

import { SignatureService } from './signature-service';
import { CallService } from './call-service';
import { WebSocketCoordinator } from './websocket-coordinator';
import {
  getOpenAIConfig,
  createCallAcceptConfig,
  type OpenAIRealtimeConfig,
  type WebhookEvent,
  type WebhookHandlerOptions
} from './config';
import { ToolsManager } from '../tools/tools-manager';
import { UserCreationService } from '../tools/user-creation';
import { CallContextManager, initializeAgentMemory, agentServiceContainer } from '../memory';
import { businessContextProvider } from '../../shared/lib/database/business-context-provider';
import { PromptBuilder } from '../intelligence/prompt-builder';
import type { QuoteFunctionArgs } from '../tools/types';
import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Business } from '../../shared/lib/database/types/business';
import type { User } from '../../shared/lib/database/types/user';

// ============================================================================
// NEW WEBHOOK HANDLER (THIN ORCHESTRATOR)
// ============================================================================

export class VoiceWebhookHandler {
  private config: OpenAIRealtimeConfig;
  private signatureService: SignatureService;
  private callService: CallService;
  private webSocketCoordinator: WebSocketCoordinator;
  private userCreationService: UserCreationService;
  private callContextManager: CallContextManager;
  private toolsManagerMap: Map<string, ToolsManager> = new Map(); // Business tools cache

  constructor(options: WebhookHandlerOptions = {}) {
    this.config = { ...getOpenAIConfig(), ...options.config };

    // Create utility services (stateless, no event listeners)
    this.signatureService = new SignatureService(this.config.webhookSecret);
    this.callService = new CallService(this.config.apiKey);

    // Create per-request services (stateful)
    this.callContextManager = new CallContextManager();
    this.webSocketCoordinator = new WebSocketCoordinator(this.callContextManager);

    // Get shared services from container
    this.userCreationService = agentServiceContainer.getUserCreationService();
  }

  // ============================================================================
  // MAIN CALL PROCESSING
  // ============================================================================

  async handleIncomingCall(
    event: WebhookEvent,
    options: WebhookHandlerOptions = {}
  ): Promise<void> {
    const callId = event.data.call_id;

    try {
      console.log(`📞 [VoiceHandler] Processing incoming call: ${callId}`);

      // 1. Extract and validate call data
      const callData = await this.extractAndValidateCallData(event);

      // 2. Get business context
      const { businessContext, businessEntity } = await businessContextProvider.getBusinessDataByTwilioSid(callData.twilioAccountSid);
      console.log(`✅ [VoiceHandler] Found business: ${businessContext.businessInfo.name}`);

      // 3. Lookup user by phone number
      const userLookupResult = await this.userCreationService.lookupUserByPhone(callData.phoneNumber, businessEntity.id);
      console.log(`👤 [VoiceHandler] User context: ${userLookupResult.user ? `${userLookupResult.user.first_name} (returning)` : 'new customer'}`);

      // 4. Initialize call context with user data
      await this.callContextManager.initializeCall({
        callId,
        businessId: businessEntity.id,
        userId: userLookupResult.user?.id || null,
        phoneNumber: callData.phoneNumber,
        user: userLookupResult.user,
        business: businessEntity
      });

      // 5. Setup tools and generate AI instructions with user context
      const tools = this.getOrCreateToolsManager(businessEntity.id, businessContext, businessEntity);
      const aiInstructions = await this.generateAIInstructions(businessContext, userLookupResult.user);

      // 5. Accept call with AI configuration
      await this.acceptCall(callId, aiInstructions, options);

      // 6. Start WebSocket coordination
      await this.webSocketCoordinator.startCallSession({
        callId,
        apiKey: this.config.apiKey,
        initialTools: tools.getStaticToolsForAI() as unknown as Array<Record<string, unknown>>,
        onError: (error) => this.handleCallError(callId, error, options),
        onClose: (code, reason) => this.handleCallClose(callId, code, reason)
      });

      console.log(`✅ [VoiceHandler] Call ${callId} fully initialized`);

    } catch (error) {
      console.error(`❌ [VoiceHandler] Failed to process call ${callId}:`, error);
      if (options.onError) {
        options.onError(error as Error, callId);
      }
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

    // Log SIP headers for debugging
    console.log('📋 [VoiceHandler] SIP Headers:');
    sipHeaders.forEach(header => {
      console.log(`   ${header.name}: ${header.value}`);
    });

    // Extract Twilio Account SID
    const twilioAccountSid = this.extractTwilioAccountSid(sipHeaders);
    if (!twilioAccountSid) {
      throw new Error('Missing Twilio Account SID');
    }

    // Extract caller phone number
    const phoneNumber = this.extractCallerPhoneNumber(sipHeaders);
    if (!phoneNumber) {
      throw new Error('Missing caller phone number');
    }

    return {
      callId,
      twilioAccountSid,
      phoneNumber
    };
  }

  private extractTwilioAccountSid(sipHeaders: Array<{name: string; value: string}>): string | null {
    const header = sipHeaders.find(h => h.name === 'X-Twilio-AccountSid');
    if (header?.value) {
      console.log(`🆔 [VoiceHandler] Found Twilio Account SID: ${header.value}`);
      return header.value;
    }
    return null;
  }

  private extractCallerPhoneNumber(sipHeaders: Array<{name: string; value: string}>): string | null {
    const phoneHeaders = ['From', 'X-Twilio-From', 'Remote-Party-ID', 'P-Asserted-Identity'];

    for (const headerName of phoneHeaders) {
      const header = sipHeaders.find(h => h.name === headerName);
      if (header?.value) {
        const phoneMatch = header.value.match(/\+?[\d\s\-\(\)]+/);
        if (phoneMatch) {
          const cleanPhone = phoneMatch[0].replace(/[\s\-\(\)]/g, '');
          console.log(`📞 [VoiceHandler] Found caller phone: ${cleanPhone} (from ${headerName})`);
          return cleanPhone;
        }
      }
    }
    return null;
  }

  // ============================================================================
  // AI CONFIGURATION
  // ============================================================================

  private async generateAIInstructions(businessContext: BusinessContext, user: User | null = null): Promise<string> {
    return PromptBuilder.buildPrompt(businessContext, {
      includeTools: true,
      userContext: user,
      customInstructions: "Focus on closing leads quickly and professionally. Keep responses conversational and brief for phone calls."
    });
  }

  private getOrCreateToolsManager(businessId: string, businessContext: BusinessContext, business: Business): ToolsManager {
    if (!this.toolsManagerMap.has(businessId)) {
      console.log(`🔧 [VoiceHandler] Creating ToolsManager for business: ${businessId}`);
      const manager = new ToolsManager(businessContext, business);
      this.toolsManagerMap.set(businessId, manager);
    }
    return this.toolsManagerMap.get(businessId)!;
  }

  // ============================================================================
  // CALL ACCEPTANCE
  // ============================================================================

  private async acceptCall(callId: string, instructions: string, options: WebhookHandlerOptions): Promise<void> {
    const callConfig = createCallAcceptConfig(
      instructions,
      this.config.model,
      this.config.voice
    );

    const acceptResult = await this.callService.acceptCall(callId, callConfig);

    if (!acceptResult.success) {
      throw new Error(acceptResult.error || 'Call accept failed');
    }

    console.log(`✅ [VoiceHandler] Call ${callId} accepted successfully`);

    if (options.onCallAccepted) {
      options.onCallAccepted(callId);
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleCallError(callId: string, error: Error, options: WebhookHandlerOptions): void {
    console.error(`❌ [VoiceHandler] Call error ${callId}:`, error);

    // End call context
    this.callContextManager.endCall(callId, `error: ${error.message}`).catch(endError => {
      console.error(`❌ [VoiceHandler] Failed to end call context:`, endError);
    });

    if (options.onError) {
      options.onError(error, callId);
    }
  }

  private async handleCallClose(callId: string, code: number, reason: string): Promise<void> {
    console.log(`🔌 [VoiceHandler] Call ${callId} closed - Code: ${code}, Reason: ${reason}`);

    try {
      // 1. End call context (triggers Redis TTL + conversation persistence)
      await this.callContextManager.endCall(callId, `websocket_close: ${code}`);

      // 2. Clean up local webhook handler resources
      await this.cleanupLocalResources(callId);

      console.log(`✅ [VoiceHandler] Call ${callId} cleanup completed`);

    } catch (error) {
      console.error(`❌ [VoiceHandler] Cleanup failed for ${callId}:`, error);
    }
  }

  // ============================================================================
  // FUNCTION CALL HANDLING (Delegated to Tools)
  // ============================================================================

  async handleFunctionCall(
    callId: string,
    functionName: string,
    args: QuoteFunctionArgs
  ): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
      // Get tools manager for this call's business
      const callContext = await this.callContextManager.getCallContext(callId);
      if (!callContext) {
        throw new Error(`No call context found for: ${callId}`);
      }

      const toolsManager = this.toolsManagerMap.get(callContext.businessId);
      if (!toolsManager) {
        throw new Error(`No tools manager found for business: ${callContext.businessId}`);
      }

      console.log(`🚀 [VoiceHandler] Executing function: ${functionName} for call: ${callId}`);
      const result = await toolsManager.executeFunction(functionName, args);

      // Update call context with function results
      if (functionName === 'select_service' && result.success) {
        // Service selection updates tools availability
        await this.updateSessionToolsAfterServiceSelection(callId, toolsManager);
      }

      return result;

    } catch (error) {
      console.error(`❌ [VoiceHandler] Function execution error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async updateSessionToolsAfterServiceSelection(callId: string, toolsManager: ToolsManager): Promise<void> {
    try {
      // Get updated tools (now includes get_quote)
      const staticSchemas = toolsManager.getStaticToolsForAI();
      const dynamicQuoteSchema = toolsManager.getQuoteSchemaForSelectedService();

      if (dynamicQuoteSchema) {
        const allSchemas = [...staticSchemas, dynamicQuoteSchema];
        console.log(`🔄 [VoiceHandler] Updated tools for ${callId}: ${allSchemas.map(s => s.name).join(', ')}`);

        // Update context manager with new tools
        await this.callContextManager.updateAvailableTools(callId, allSchemas.map(s => s.name));
      }

    } catch (error) {
      console.error(`❌ [VoiceHandler] Failed to update session tools:`, error);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  private async cleanupLocalResources(callId: string): Promise<void> {
    try {
      // Get call context to find business ID
      const callContext = await this.callContextManager.getCallContext(callId);

      if (callContext) {
        // Clean up tools manager for this specific business
        const toolsManager = this.toolsManagerMap.get(callContext.businessId);
        if (toolsManager) {
          toolsManager.clearSelectedService();
          this.toolsManagerMap.delete(callContext.businessId);
          console.log(`🧹 [VoiceHandler] Cleared tools cache for business: ${callContext.businessId}`);
        }
      } else {
        // Fallback: clear all tools cache if we can't find specific business
        this.toolsManagerMap.clear();
        console.log(`🧹 [VoiceHandler] Cleared all tools cache (fallback)`);
      }

    } catch (error) {
      // Critical: Always clean up tools cache even if context lookup fails
      this.toolsManagerMap.clear();
      console.error(`❌ [VoiceHandler] Cleanup error, cleared all tools cache:`, error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    timestamp: string,
    webhookId?: string
  ): boolean {
    return this.signatureService.verifySignature(rawBody, signatureHeader, timestamp, webhookId).isValid;
  }

  getConfig(): OpenAIRealtimeConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<OpenAIRealtimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.signatureService = new SignatureService(this.config.webhookSecret);
    this.callService = new CallService(this.config.apiKey);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  static async initialize(options: WebhookHandlerOptions = {}): Promise<VoiceWebhookHandler> {
    // Initialize memory system
    await initializeAgentMemory();

    // Create handler instance
    const handler = new VoiceWebhookHandler(options);

    console.log('✅ [VoiceHandler] Voice webhook handler initialized with new architecture');
    return handler;
  }
}
