import { sessionManager } from "./sessionManager";
import { Session } from "./session";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { TokenSpent } from "../types";
import { WebhookEvent } from "@/app/api/voice/twilio-webhook/route";
import { sentry } from "@/features/shared/utils/sentryService";
import assert from "assert";

export class SessionService {
  static async createOrGet(callId: string, event: WebhookEvent) {
    try {
      let session = await sessionManager.get(callId);

      if (session) {
        // Add breadcrumb for existing session retrieval
        sentry.addBreadcrumb(`Existing session retrieved`, 'session-service', {
          sessionId: callId,
          businessId: session.businessId,
          status: session.status
        });

        // Return existing session
        return session;
      } else {
        // Add breadcrumb for new session creation
        sentry.addBreadcrumb(`Creating new session`, 'session-service', {
          sessionId: callId,
          eventType: event.type
        });

        const sipHeaders = event.data.sip_headers!;
        const twilioAccountSid = this.extractTwilioAccountSid(sipHeaders);
        const phoneNumber = this.extractPhoneNumber(sipHeaders);

        assert(twilioAccountSid, 'Twilio Account SID not found in SIP headers');

        const businessRepository = new BusinessRepository();
        const userRepository = new UserRepository();
        const [business, customer] = await Promise.all([
          businessRepository.findByTwilioAccountSid(twilioAccountSid),
          userRepository.findOne({
            phone_number: phoneNumber
          })
        ]);

        assert(business, `Business not found for Twilio Account SID: ${twilioAccountSid}`);

        session = {
          id: callId,
          businessId: business.id,
          businessEntity: business,
          customerPhoneNumber: phoneNumber || '',
          customerId: customer?.id,
          customerEntity: customer || undefined,
          status: "active",
          channel: "phone",
          interactions: [],
          tokenUsage: {} as TokenSpent,
          startedAt: Date.now(),
          eventType: event.type,
          // Tool system fields
          serviceNames: [],
          quotes: [],
          conversationState: 'service_selection',
          availableTools: [],
          activeTools: [],
          // Interaction tracking initialization
          isFirstAiResponse: true,
          // Stage management fields (defaults)
          currentStage: 'service_selection',
          availableToolNames: []
        } as Session;

        sessionManager.add(session);

        // Success breadcrumb
        sentry.addBreadcrumb(`New session created successfully`, 'session-service', {
          sessionId: callId,
          businessId: business.id,
          businessName: business.name,
          hasExistingCustomer: !!customer,
          customerPhoneNumber: phoneNumber
        });
      }

      return session;

    } catch (error) {
      // Track error in Sentry
      sentry.trackError(error as Error, {
        sessionId: callId,
        businessId: 'unknown',
        operation: 'session_service_create_or_get',
        metadata: {
          eventType: event.type,
          hasData: !!event.data,
          hasSipHeaders: !!(event.data?.sip_headers)
        }
      });

      throw error; // Re-throw so caller can handle
    }
  }

  private static extractTwilioAccountSid(sipHeaders: Array<{name: string; value: string}>): string | null {
    const header = sipHeaders.find(h => h.name === 'X-Twilio-AccountSid');
    return header?.value || null;
  }

  private static extractPhoneNumber(sipHeaders: Array<{name: string; value: string}>): string | null {
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
}
