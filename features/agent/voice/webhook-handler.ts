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
import { initializeAgentMemory, agentServiceContainer, type CallContextManager } from '../memory';
import { type VoiceEventBus } from '../memory/redis/event-bus';
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
  private webSocketCoordinator: WebSocketCoordinator | null = null;
  private callContextManager: CallContextManager;
  private voiceEventBus: VoiceEventBus;
  private toolsManagerMap: Map<string, ToolsManager> = new Map(); // Business tools cache

  constructor(options: WebhookHandlerOptions = {}) {
    this.config = { ...getOpenAIConfig(), ...options.config };

    // Create utility services (stateless, no event listeners)
    this.signatureService = new SignatureService(this.config.webhookSecret);
    this.callService = new CallService(this.config.apiKey);

    // Get shared services from container
    this.voiceEventBus = agentServiceContainer.getVoiceEventBus();

    // Create per-request services (stateful) with dependency injection
    this.callContextManager = agentServiceContainer.createCallContextManager();
    // WebSocket coordinator will be created per call with specific ToolsManager
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
      // 1. Extract and validate call data
      const callData = await this.extractAndValidateCallData(event);


      // 2. Get business context
      const { businessContext, businessEntity } = await businessContextProvider.getBusinessDataByTwilioSid(callData.twilioAccountSid);

      // 3. Initialize call context (user creation now handled by AI tools)
      await this.callContextManager.initializeCall({
        callId,
        businessId: businessEntity.id,
        userId: null, // User creation now handled by AI tools during conversation
        phoneNumber: callData.phoneNumber,
        businessPhoneNumber: businessContext.businessInfo.phone,
        user: null, // User creation now handled by AI tools during conversation
        business: businessEntity
      });

      // 5. Setup tools and generate AI instructions with caller context
      const tools = this.getOrCreateToolsManager(businessEntity.id, businessContext, businessEntity);
      const aiInstructions = await this.generateAIInstructions(businessContext, null, callData.phoneNumber);

      // 6. Update WebSocket coordinator with tools manager for direct execution
      this.webSocketCoordinator = new WebSocketCoordinator(this.callContextManager, this.voiceEventBus, tools);

      // 7. Accept call with AI configuration
      await this.acceptCall(callId, aiInstructions, options);

      // 8. Start WebSocket coordination
      if (!this.webSocketCoordinator) {
        throw new Error('WebSocket coordinator not initialized');
      }
      await this.webSocketCoordinator.startCallSession({
        callId,
        apiKey: this.config.apiKey,
        initialTools: tools.getStaticToolsForAI() as unknown as Array<Record<string, unknown>>,
        onError: (error) => this.handleCallError(callId, error, options),
        onClose: (code, reason) => this.handleCallClose(callId, code, reason)
      });


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

    // SIP headers available for debugging if needed

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
    return header?.value || null;
  }

  private extractCallerPhoneNumber(sipHeaders: Array<{name: string; value: string}>): string | null {
    const phoneHeaders = ['From', 'X-Twilio-From', 'Remote-Party-ID', 'P-Asserted-Identity'];

    for (const headerName of phoneHeaders) {
      const header = sipHeaders.find(h => h.name === headerName);
      if (header?.value) {
        const phoneMatch = header.value.match(/\+?[\d\s\-\(\)]+/);
        if (phoneMatch) {
          const cleanPhone = phoneMatch[0].replace(/[\s\-\(\)]/g, '');
          return cleanPhone;
        }
      }
    }
    return null;
  }

  // ============================================================================
  // AI CONFIGURATION
  // ============================================================================

  private async generateAIInstructions(businessContext: BusinessContext, user: User | null = null, callerPhoneNumber?: string): Promise<string> {
    let customInstructions = "Focus on closing leads quickly and professionally. Keep responses conversational and brief for phone calls.";

    // Add caller's phone number to instructions so AI can use it in create_user
    if (callerPhoneNumber) {
      customInstructions += `\n\n**CALLER INFORMATION**:\n- Caller's phone number: ${callerPhoneNumber}\n- Use this phone number when calling create_user() function.`;
    }

    return PromptBuilder.buildPrompt(businessContext, {
      includeTools: true,
      userContext: user,
      customInstructions
    });
  }

  private getOrCreateToolsManager(businessId: string, businessContext: BusinessContext, business: Business): ToolsManager {
    if (!this.toolsManagerMap.has(businessId)) {
      const manager = new ToolsManager(businessContext, business, this.callContextManager);
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

    if (options.onCallAccepted) {
      options.onCallAccepted(callId);
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private async handleCallError(callId: string, error: Error, options: WebhookHandlerOptions): Promise<void> {
    console.error(`❌ [VoiceHandler] Call error ${callId}:`, error);

    // No event publication - CallContextManager owns call lifecycle events
    // The CallContextManager will detect the error state and handle call ending

    if (options.onError) {
      options.onError(error, callId);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleCallClose(callId: string, _code: number, _reason: string): Promise<void> {
    try {
      // Clean up local webhook handler resources only
      // Note: Call state updates happen via events from WebSocketCoordinator
      await this.cleanupLocalResources(callId);

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

      console.log('⚡ [WebhookHandler] Executing function through ToolsManager...');
      const startTime = Date.now();

      const result = await toolsManager.executeFunction(functionName, args);

      const executionTime = Date.now() - startTime;
      console.log(`🏁 [WebhookHandler] Function execution completed in ${executionTime}ms`);
      console.log(`   ${result.success ? '✅' : '❌'} Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

      // Update call context with function results
      if (functionName === 'select_service' && result.success) {
        console.log('🔄 [WebhookHandler] Service selected - updating AI with dynamic quote schema...');
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
      console.log('🔄 [WebhookHandler] Updating OpenAI session with dynamic schemas...');

      // Get static tools + dynamic quote schema for selected service
      const staticSchemas = toolsManager.getStaticToolsForAI();
      const dynamicQuoteSchema = toolsManager.getQuoteSchemaForSelectedService();

      console.log(`   📊 Static schemas: ${staticSchemas.length}`);
      console.log(`   🎯 Dynamic quote schema: ${dynamicQuoteSchema ? 'GENERATED' : 'NOT AVAILABLE'}`);

      if (dynamicQuoteSchema) {
        const allSchemas = [...staticSchemas, dynamicQuoteSchema];

        console.log('🔧 [WebhookHandler] Complete schema set for OpenAI:');
        allSchemas.forEach(schema => {
          console.log(`   📋 Function: ${schema.name} - ${schema.description}`);
        });

        console.log('📤 [WebhookHandler] Updating WebSocket with new tool schemas...');

        // Update the actual WebSocket session with OpenAI
        if (this.webSocketCoordinator) {
          await this.webSocketCoordinator.updateSessionTools(allSchemas as unknown as Array<Record<string, unknown>>);
        } else {
          console.warn('⚠️ [WebhookHandler] WebSocket coordinator not available for schema update');
        }

        // Update context manager with new tools including dynamic quote schema
        await this.callContextManager.updateAvailableTools(callId, allSchemas.map(s => s.name));

        console.log(`✅ [WebhookHandler] Dynamic quote schema successfully added for selected service`);
        console.log('📋 [WebhookHandler] Complete tools update payload:');
        console.log(JSON.stringify(allSchemas, null, 2));
      } else {
        console.log('⚠️ [WebhookHandler] No dynamic quote schema available - keeping static schemas only');
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
        }
      } else {
        // Fallback: clear all tools cache if we can't find specific business
        this.toolsManagerMap.clear();
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

  // Function calls now handled directly via WebSocket coordinator - no events needed

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  static async initialize(options: WebhookHandlerOptions = {}): Promise<VoiceWebhookHandler> {
    // Initialize memory system
    await initializeAgentMemory();

    // Create handler instance
    const handler = new VoiceWebhookHandler(options);

    return handler;
  }
}
