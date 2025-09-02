import { SignatureService } from './signature-service';
import { CallService } from './call-service';
import { WebSocketService } from './websocket-service';
import {
  getOpenAIConfig,
  getCallAcceptConfig,
  getResponseCreateConfig,
  OpenAIRealtimeConfig
} from './config';

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

    // Extract business identifier from SIP headers
    const dialedNumber = this.extractDialedNumber(event.data.sip_headers || []);
    console.log(`📞 Dialed business number: ${dialedNumber}`);

    // Use setTimeout to handle call asynchronously while returning webhook response quickly
    setTimeout(async () => {
      try {
        // Step 1: Accept the call via REST API
        const callAcceptConfig = getCallAcceptConfig(this.config);
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

        // Step 2: Connect to WebSocket for real-time communication
        const responseConfig = getResponseCreateConfig(options.customGreeting);

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
   * Extract the dialed business phone number from SIP headers
   */
  private extractDialedNumber(sipHeaders: Array<{name: string; value: string}>): string {
    // Look for "Diversion" header which contains the original dialed number
    const diversionHeader = sipHeaders.find(h => h.name === 'Diversion')?.value;

    if (diversionHeader) {
      // Extract phone number from: "<sip:+61468002102@twilio.com>;reason=unconditional"
      const phoneMatch = diversionHeader.match(/\+\d{10,15}/);
      if (phoneMatch) {
        console.log(`📞 Found dialed number in Diversion header: ${phoneMatch[0]}`);
        return phoneMatch[0];
      }
    }

    // Fallback: look in "To" header
    const toHeader = sipHeaders.find(h => h.name === 'To')?.value;
    if (toHeader) {
      const phoneMatch = toHeader.match(/\+\d{10,15}/);
      if (phoneMatch) {
        console.log(`📞 Found dialed number in To header: ${phoneMatch[0]}`);
        return phoneMatch[0];
      }
    }

    throw new Error('Could not extract dialed phone number from SIP headers');
  }
}
