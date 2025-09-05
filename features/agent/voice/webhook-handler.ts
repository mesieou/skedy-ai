import { SignatureService } from './signature-service';
import { CallService } from './call-service';
import { WebSocketService } from './websocket-service';
import {
  getOpenAIConfig,
  createCallAcceptConfig,
  OpenAIRealtimeConfig,
  WebhookEvent,
  WebhookHandlerOptions
} from './config';
import { ToolsManager } from '../tools/tools-manager';
import type { QuoteFunctionArgs } from '../tools/types';
import { businessContextProvider } from '../../shared/lib/database/business-context-provider';
import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Business } from '../../shared/lib/database/types/business';
import { PromptBuilder } from '../intelligence/prompt-builder';


export class WebhookHandler {
  private config: OpenAIRealtimeConfig;
  private signatureService: SignatureService;
  private callService: CallService;
  private webSocketService: WebSocketService;
  private toolsManagerMap: Map<string, ToolsManager> = new Map(); // Cache tools by business
  private callBusinessMap: Map<string, string> = new Map(); // callId -> businessId
  private activeWebSocketMap: Map<string, WebSocketService> = new Map(); // callId -> WebSocketService

  constructor(options: WebhookHandlerOptions = {}) {
    this.config = { ...getOpenAIConfig(), ...options.config };
    this.signatureService = new SignatureService(this.config.webhookSecret);
    this.callService = new CallService(this.config.apiKey);
    this.webSocketService = new WebSocketService();
  }

    async handleIncomingCall(
    event: WebhookEvent,
    options: WebhookHandlerOptions = {}
  ): Promise<void> {
    const callId = event.data.call_id;

    console.log(`📞 Processing incoming call with ID: ${callId}`);
    // console.log('📋 Full event data:', JSON.stringify(event, null, 2));

    // Extract Twilio Account SID from SIP headers
    const twilioAccountSid = this.extractTwilioAccountSid(event.data.sip_headers || []);

    if (!twilioAccountSid) {
      console.error('❌ No Twilio Account SID found - cannot identify business');
      console.error('📋 Available SIP headers:', event.data.sip_headers?.map(h => h.name) || 'none');

      if (options.onError) {
        options.onError(new Error('Missing Twilio Account SID'), callId);
      }
      return;
    }

                    // Accept call IMMEDIATELY with dynamic instructions and tools
    try {
      // Get complete business data (context + entity)
      const { businessContext, businessEntity } = await businessContextProvider.getBusinessDataByTwilioSid(twilioAccountSid);
      console.log(`✅ Found business: ${businessContext.businessInfo.name}`);

      // Create or get cached tools manager for this business
      const toolsManager = this.getToolsManager(businessEntity.id, businessContext, businessEntity);
      const tools = toolsManager.getStaticToolsForAI();

      console.log(`🔧 Configured ${tools.length} tools:`, tools.map(t => t.name));

      // Generate dynamic instructions with tools enabled
      const dynamicInstructions = PromptBuilder.buildPrompt(businessContext, {
        includeTools: true,
        customInstructions: "Focus on closing leads quickly and professionally. Keep responses conversational and brief for phone calls. Use tools when customers ask for quotes or pricing."
      });

      // Use config factory without tools (tools will be set via session.update)
      const callConfig = createCallAcceptConfig(
        dynamicInstructions,
        this.config.model,
        this.config.voice
        // No tools - will be set via WebSocket session.update
      );

      const acceptResult = await this.callService.acceptCall(callId, callConfig);

      if (!acceptResult.success) {
        throw new Error(acceptResult.error || 'Call accept failed');
      }

      console.log(`✅ Call ${callId} accepted with dynamic instructions and ${tools.length} tools`);

      // Store business ID for this call (for function calling)
      this.storeCallBusinessMapping(callId, businessEntity.id);

      // Start WebSocket in background with initial tools (Flask threading pattern)
      this.processWebSocketInBackground(callId, tools as unknown as Array<Record<string, unknown>>, options);

    } catch (error) {
      console.error(`❌ Error accepting call ${callId}:`, error);
      if (options.onError) {
        options.onError(error as Error, callId);
      }
    }
  }

      /**
   * Process WebSocket connection in background (Flask pattern)
   */
  private processWebSocketInBackground(
    callId: string,
    initialTools: Array<Record<string, unknown>>,
    options: WebhookHandlerOptions
  ): void {
    // Start in background thread (like Flask threading.Thread)
    setTimeout(async () => {
      try {
        console.log(`🔌 Starting WebSocket for call ${callId} in background...`);
        await this.connectWebSocket(callId, initialTools, options);
      } catch (error) {
        console.error(`❌ Background WebSocket error for call ${callId}:`, error);
        if (options.onError) {
          options.onError(error as Error, callId);
        }
      }
    }, 0);
  }



  /**
   * Connect WebSocket with proper error handling
   */
  private async connectWebSocket(callId: string, initialTools: Array<Record<string, unknown>>, options: WebhookHandlerOptions): Promise<void> {
    console.log(`🔌 Connecting WebSocket for call ${callId}...`);

    // Create a new WebSocketService instance for this call
    const webSocketService = new WebSocketService();
    this.activeWebSocketMap.set(callId, webSocketService);

    await webSocketService.connect({
      callId,
      apiKey: this.config.apiKey,
      initialTools: initialTools,
      onMessage: () => {
        // Additional custom message handling can be added here
      },
      onError: (error) => {
        console.error(`❌ WebSocket error for call ${callId}:`, error);
        if (options.onError) {
          options.onError(error, callId);
        }
      },
      onClose: (code, reason) => {
        console.log(`🔌 WebSocket closed for call ${callId} - Code: ${code}, Reason: ${reason}`);
        // Clean up when WebSocket closes
        this.cleanupCall(callId);
      },
      onFunctionCall: async (functionName: string, args: Record<string, unknown>) => {
        // Handle function calls from OpenAI
        const result = await this.handleFunctionCall(callId, functionName, args as QuoteFunctionArgs);

        // If service selection was successful, update session tools
        if (functionName === 'select_service' && result.success) {
          await this.updateSessionToolsAfterServiceSelection(callId);
        }

        return result;
      }
    });

    console.log(`✅ WebSocket connected for call ${callId}`);

    if (options.onWebSocketConnected) {
      options.onWebSocketConnected(callId);
    }
  }

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    timestamp: string,
    webhookId?: string
  ): boolean {
    const result = this.signatureService.verifySignature(rawBody, signatureHeader, timestamp, webhookId);
    return result.isValid;
  }

  // Utility method to get current configuration
  getConfig(): OpenAIRealtimeConfig {
    return { ...this.config };
  }

    // Utility method to update configuration
  updateConfig(newConfig: Partial<OpenAIRealtimeConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize services with new config
    this.signatureService = new SignatureService(this.config.webhookSecret);
    this.callService = new CallService(this.config.apiKey);
  }

  /**
   * Generate dynamic AI prompt from business context
   */


  /**
   * Get or create tools manager for a business (with caching)
   */
  private getToolsManager(businessId: string, businessContext: BusinessContext, business: Business): ToolsManager {
    if (!this.toolsManagerMap.has(businessId)) {
      console.log(`🔧 Creating new ToolsManager for business: ${businessId}`);
      const manager = new ToolsManager(businessContext, business);
      this.toolsManagerMap.set(businessId, manager);
    }
    return this.toolsManagerMap.get(businessId)!;
  }

  /**
   * Store call to business mapping
   */
  private storeCallBusinessMapping(callId: string, businessId: string): void {
    this.callBusinessMap.set(callId, businessId);
    console.log(`🆔 Stored mapping: call ${callId} -> business ${businessId}`);
  }

  /**
   * Get business ID for a call
   */
  getBusinessIdForCall(callId: string): string | undefined {
    return this.callBusinessMap.get(callId);
  }

  /**
   * Handle function calls from OpenAI Realtime API
   * This would be called when the WebSocket receives function_call events
   */
  async handleFunctionCall(
    callId: string,
    functionName: string,
    args: QuoteFunctionArgs
  ): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
      // Get business ID for this call
      const businessId = this.callBusinessMap.get(callId);
      if (!businessId) {
        throw new Error(`No business ID found for call: ${callId}`);
      }

      const toolsManager = this.toolsManagerMap.get(businessId);
      if (!toolsManager) {
        throw new Error(`No tools manager found for business: ${businessId}`);
      }

      console.log(`🚀 Executing function: ${functionName} for call: ${callId}`, args);
      const result = await toolsManager.executeFunction(functionName, args);

      console.log(`✅ Function result:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Function execution error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

    /**
   * Update session tools after successful service selection
   */
  private async updateSessionToolsAfterServiceSelection(callId: string): Promise<void> {
    try {
      const businessId = this.callBusinessMap.get(callId);
      if (!businessId) {
        console.error(`❌ No business ID found for call: ${callId}`);
        return;
      }

      const toolsManager = this.toolsManagerMap.get(businessId);
      if (!toolsManager) {
        console.error(`❌ No tools manager found for business: ${businessId}`);
        return;
      }

      const webSocketService = this.activeWebSocketMap.get(callId);
      if (!webSocketService) {
        console.error(`❌ No WebSocket service found for call: ${callId}`);
        return;
      }

      // Get static schemas (select_service) + dynamic quote schema for selected service
      const staticSchemas = toolsManager.getStaticToolsForAI();
      const dynamicQuoteSchema = toolsManager.getQuoteSchemaForSelectedService();

      if (!dynamicQuoteSchema) {
        console.error(`❌ No quote schema generated for selected service`);
        return;
      }

      const allSchemas = [...staticSchemas, dynamicQuoteSchema];

      console.log(`🔄 Updating session tools for call ${callId}: ${allSchemas.map(s => s.name).join(', ')}`);

      // Send session update to OpenAI
      webSocketService.updateSessionTools(allSchemas as unknown as Array<Record<string, unknown>>);

    } catch (error) {
      console.error(`❌ Error updating session tools for call ${callId}:`, error);
    }
  }

  /**
   * Clean up call data when call ends
   */
  cleanupCall(callId: string): void {
    const businessId = this.callBusinessMap.get(callId);
    if (businessId) {
      // Clear selected service state before deleting tools manager
      const toolsManager = this.toolsManagerMap.get(businessId);
      if (toolsManager) {
        toolsManager.clearSelectedService();
      }

      this.toolsManagerMap.delete(businessId); // drop tools after each call
    }

    // Clean up WebSocket service reference
    this.activeWebSocketMap.delete(callId);
    this.callBusinessMap.delete(callId);
    console.log(`🧹 Cleaned up call mapping & tools for: ${callId}`);
  }

          /**
   * Extract Twilio Account SID from SIP headers
   */
  private extractTwilioAccountSid(sipHeaders: Array<{name: string; value: string}>): string | null {
    const twilioAccountSid = sipHeaders.find(h => h.name === 'X-Twilio-AccountSid')?.value;

    if (twilioAccountSid) {
      console.log(`🆔 Found Twilio Account SID: ${twilioAccountSid}`);
      return twilioAccountSid;
    }

    console.warn('⚠️ No Twilio Account SID found in headers');
    return null;
  }
}
