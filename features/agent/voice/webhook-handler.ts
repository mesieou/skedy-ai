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
import { businessContextProvider } from '../../shared/lib/database/business-context-provider';
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
      return;
    }

    // Accept call IMMEDIATELY to prevent expiration
    setTimeout(async () => {
      try {
                // Step 1: Generate dynamic prompt first
        console.log(`🤖 Generating dynamic AI prompt for Twilio Account: ${twilioAccountSid}`);
        const dynamicInstructions = await this.generateDynamicPromptByTwilioSid(twilioAccountSid);

        // Step 2: Accept call with FULL config (using factory function)
        console.log(`📞 Accepting call with full configuration...`);
        const callConfig = createCallAcceptConfig(
          dynamicInstructions,
          this.config.model,
          this.config.voice
        );
        const acceptResult = await this.callService.acceptCall(callId, callConfig);

        if (!acceptResult.success) {
          console.error(`❌ Failed to accept call ${callId}:`, acceptResult.error);
          if (options.onError) {
            options.onError(new Error(acceptResult.error || 'Call accept failed'), callId);
          }
          return;
        }

        console.log(`✅ Call accepted with full config - connecting WebSocket...`);

        if (options.onCallAccepted) {
          options.onCallAccepted(callId);
        }

        // Step 3: Connect WebSocket (Flask pattern - just response.create)
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

        if (options.onWebSocketConnected) {
          options.onWebSocketConnected(callId);
        }

      } catch (error) {
        console.error(`❌ Error handling call ${callId}:`, error);
        if (options.onError) {
          options.onError(error as Error, callId);
        }
      }
    }, 0);
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
   * Generate dynamic AI prompt based on Twilio Account SID
   */
  private async generateDynamicPromptByTwilioSid(twilioAccountSid: string): Promise<string> {
    try {
      console.log(`📋 Fetching business context for Twilio SID: ${twilioAccountSid}`);

      const businessContext = await businessContextProvider.getBusinessContextByTwilioSid(twilioAccountSid);

      console.log(`✅ Found business: ${businessContext.businessInfo.name}`);
      console.log(`🛠️  Services: ${businessContext.services.length}`);
      console.log(`❓ FAQs: ${businessContext.frequently_asked_questions.length}`);

      // Generate complete AI receptionist prompt with business context
      const dynamicPrompt = PromptBuilder.buildPrompt(businessContext, {
        includeTools: true,
        customInstructions: "Focus on closing leads quickly and professionally. Keep responses conversational and brief for phone calls."
      });

      console.log(`🤖 Generated dynamic prompt (${dynamicPrompt.length} chars) for ${businessContext.businessInfo.name}`);
      return dynamicPrompt;

    } catch (error) {
      console.error(`❌ Failed to generate dynamic prompt for Twilio SID ${twilioAccountSid}:`, error);

      // Fallback to default prompt
      const fallbackPrompt = `You are a professional AI receptionist. We couldn't load the specific business information for this call. Be helpful and polite, and let them know you'll connect them to someone who can assist them better.`;

      console.log(`🔄 Using fallback prompt for Twilio SID ${twilioAccountSid}`);
      return fallbackPrompt;
    }
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
