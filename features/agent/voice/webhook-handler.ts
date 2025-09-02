import { SignatureService } from './signature-service';
import { CallService } from './call-service';
import { WebSocketService } from './websocket-service';
import {
  getOpenAIConfig,
  getCallAcceptConfig,
  getResponseCreateConfig,
  OpenAIRealtimeConfig
} from './config';
import { businessContextProvider } from '../../shared/lib/database/business-context-provider';
import { PromptBuilder } from '../intelligence/prompt-builder';

export interface WebhookEvent {
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
  };
}

export interface WebhookHandlerOptions {
  config?: Partial<OpenAIRealtimeConfig>;
  customGreeting?: string;
  onCallAccepted?: (callId: string) => void;
  onWebSocketConnected?: (callId: string) => void;
  onError?: (error: Error, callId?: string) => void;
}

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

    // Use setTimeout to handle call asynchronously while returning webhook response quickly
    setTimeout(async () => {
      try {
        // Step 1: Generate dynamic prompt based on Twilio Account SID
        console.log(`🤖 Generating dynamic AI prompt for Twilio Account: ${twilioAccountSid}`);
        const dynamicInstructions = await this.generateDynamicPromptByTwilioSid(twilioAccountSid);

        // Update config with dynamic instructions
        const dynamicConfig = {
          ...this.config,
          instructions: dynamicInstructions
        };

        // Step 2: Accept the call via REST API with dynamic config
        const callAcceptConfig = getCallAcceptConfig(dynamicConfig);
        const acceptResult = await this.callService.acceptCall(callId, callAcceptConfig);

        if (!acceptResult.success) {
          console.error(`❌ Failed to accept call ${callId}:`, acceptResult.error);
          if (options.onError) {
            options.onError(new Error(acceptResult.error || 'Call accept failed'), callId);
          }
          return;
        }

        if (options.onCallAccepted) {
          options.onCallAccepted(callId);
        }

        // Step 3: Connect to WebSocket for real-time communication
        const businessContext = await businessContextProvider.getBusinessContextByTwilioSid(twilioAccountSid);
        const dynamicGreeting = PromptBuilder.buildGreetingPrompt(businessContext.businessInfo.name);
        const responseConfig = getResponseCreateConfig(dynamicGreeting);

        await this.webSocketService.connect({
          callId,
          apiKey: this.config.apiKey,
          responseConfig,
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
