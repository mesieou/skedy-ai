import { sessionManager } from "./sessionSyncManager";
import { Session } from "./session";
import { webSocketPool } from "./websocketPool";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { TokenSpent } from "../types";
import { WebhookEvent } from "@/app/api/voice/twilio-webhook/route";
import { sentry } from "@/features/shared/utils/sentryService";
import assert from "assert";

export class SessionService {
  static async createOrGet(callId: string, event: WebhookEvent) {
    let assignedApiKeyIndex: number | undefined;

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

        // General session creation - handle different event types with assertions
        const businessRepository = new BusinessRepository();
        const userRepository = new UserRepository();

        let business, customer, phoneNumber;

        if (event.type === 'demo.session.create') {
          // Demo sessions: require business_id in event data
          const businessId = event.data.business_id as string;
          assert(businessId, 'business_id required for demo sessions');

          business = await businessRepository.findOne({ id: businessId });
          assert(business, `Business not found for demo session: ${businessId}`);

          phoneNumber = ''; // No phone for demo
          customer = undefined; // No customer for demo

        } else {
          // Twilio sessions: require SIP headers
          const sipHeaders = event.data.sip_headers;
          assert(sipHeaders, 'sip_headers required for Twilio sessions');

          const twilioAccountSid = this.extractTwilioAccountSid(sipHeaders);
          assert(twilioAccountSid, 'Twilio Account SID not found in SIP headers');

          phoneNumber = this.extractPhoneNumber(sipHeaders);

          [business, customer] = await Promise.all([
            businessRepository.findByTwilioAccountSid(twilioAccountSid),
            userRepository.findOne({ phone_number: phoneNumber })
          ]);

          assert(business, `Business not found for Twilio Account SID: ${twilioAccountSid}`);
        }

        // Assign API key index from pool when creating session
        const poolAssignment = webSocketPool.assign();
        assignedApiKeyIndex = poolAssignment.index;

        session = {
          id: callId,
          businessId: business.id,
          businessEntity: business,
          customerPhoneNumber: phoneNumber || '',
          customerId: customer?.id,
          customerEntity: customer || undefined,
          status: "active",
          channel: event.type === 'demo.session.create' ? "website" : "phone",
          interactions: [],
          tokenUsage: {} as TokenSpent,
          startedAt: Date.now(),
          eventType: event.type,
          // API key assignment
          assignedApiKeyIndex,
          // Tool system fields
          serviceNames: [],
          quotes: [],
          // Interaction tracking initialization
          isFirstAiResponse: true,
          // AI-driven tool management
          allAvailableToolNames: [],
          currentTools: []
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
      // Only release API key if it was actually assigned
      if (typeof assignedApiKeyIndex === 'number') {
        webSocketPool.release(assignedApiKeyIndex);
        console.log(`🔄 [SessionService] Released API key ${assignedApiKeyIndex + 1} due to session creation failure`);
      }

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
