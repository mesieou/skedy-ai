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
import { AITools } from '../tools/ai-tools';
import type { ToolSchema } from '../tools/types';
import { businessContextProvider } from '../../shared/lib/database/business-context-provider';
import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import { PromptBuilder } from '../intelligence/prompt-builder';


export class WebhookHandler {
  private config: OpenAIRealtimeConfig;
  private signatureService: SignatureService;
  private callService: CallService;
  private webSocketService: WebSocketService;

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
    console.log('📋 Full event data:', JSON.stringify(event, null, 2));

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

                    // Accept call IMMEDIATELY with dynamic instructions (Flask pattern)
    try {
      // Get business context for dynamic instructions
      const businessContext: BusinessContext = await businessContextProvider.getBusinessContextByTwilioSid(twilioAccountSid);
      console.log(`✅ Found business: ${businessContext.businessInfo.name}`);

      // Generate dynamic instructions (no tools for now)
      const dynamicInstructions = PromptBuilder.buildPrompt(businessContext, {
        includeTools: false,
        customInstructions: "Focus on closing leads quickly and professionally. Keep responses conversational and brief for phone calls."
      });

      // Use config factory without tools
      const callConfig = createCallAcceptConfig(
        dynamicInstructions,
        this.config.model,
        this.config.voice
      );

      const acceptResult = await this.callService.acceptCall(callId, callConfig);

      if (!acceptResult.success) {
        throw new Error(acceptResult.error || 'Call accept failed');
      }

      console.log(`✅ Call ${callId} accepted with dynamic instructions`);

      // Start WebSocket in background (Flask threading pattern)
      this.processWebSocketInBackground(callId, options);

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
    options: WebhookHandlerOptions
  ): void {
    // Start in background thread (like Flask threading.Thread)
    setTimeout(async () => {
      try {
        console.log(`🔌 Starting WebSocket for call ${callId} in background...`);
        await this.connectWebSocket(callId, options);
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
  private async connectWebSocket(callId: string, options: WebhookHandlerOptions): Promise<void> {
    console.log(`🔌 Connecting WebSocket for call ${callId}...`);

    await this.webSocketService.connect({
      callId,
      apiKey: this.config.apiKey,
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
