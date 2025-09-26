import { sessionManager } from "./sessionSyncManager";
import { Session } from "./session";
import { webSocketPool } from "./websocketPool";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { TokenSpent } from "../types";
import { WebhookEvent } from "@/app/api/voice/twilio-webhook/route";
import { sentry } from "@/features/shared/utils/sentryService";
import { Business } from "@/features/shared/lib/database/types/business";
import { BusinessCategory } from "@/features/shared/lib/database/types/business";
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
          // Demo website chat: business_id provided in event data
          const businessId = event.data.business_id as string;
          assert(businessId, 'business_id required for demo sessions');

          business = await businessRepository.findOne({ id: businessId });
          assert(business, `Business not found for demo session: ${businessId}`);

          phoneNumber = ''; // No phone for demo
          customer = undefined; // No customer for demo

        } else if (event.type === 'demo.phone.call') {

          // Demo website phone call: business choice stored in Redis
          console.log('📞 [SessionService] Demo website phone call - checking stored choice...');
          business = await this.tryFindDemoBusinessChoice();
          assert(business, 'Business not found for demo phone call - no stored choice');

          const sipHeaders = event.data.sip_headers;
          assert(sipHeaders, 'sip_headers required for Twilio sessions');

          phoneNumber = this.extractPhoneNumber(sipHeaders);
          customer = phoneNumber ? await userRepository.findOne({ phone_number: phoneNumber }) : undefined;

        } else if (event.type === 'realtime.call.incoming') {
          // Real phone calls: use removalist business (simple approach)
          const sipHeaders = event.data.sip_headers;
          assert(sipHeaders, 'sip_headers required for Twilio sessions');

          const twilioAccountSid = this.extractTwilioAccountSid(sipHeaders);
          assert(twilioAccountSid, 'Twilio Account SID not found in SIP headers');

          // Simple: Find removalist business by phone number
          //temporary fix for demo phone call
          const calledNumber = this.extractPhoneNumber(sipHeaders);
          business = await businessRepository.findOne({
            phone_number: calledNumber || '+61468002102',
            business_category: 'removalist'
          });

          customer = await userRepository.findOne({ phone_number: phoneNumber });
          assert(business, 'Business not found for phone call-temporary fix for demo phone call');

        } else {
          // Other event types (future expansion)
          throw new Error(`Unsupported event type: ${event.type}`);
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

        console.log(`🔄 [SessionService] Assigned API key ${assignedApiKeyIndex + 1} to session ${callId}`);
        // Success breadcrumb
        sentry.addBreadcrumb(`New session created successfully`, 'session-service', {
          sessionId: callId,
          businessId: business.id,
          businessName: business.name,
          hasExistingCustomer: !!customer,
          customerPhoneNumber: phoneNumber,
          assignedApiKeyIndex: assignedApiKeyIndex
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

  private static async tryFindDemoBusinessChoice(): Promise<Business | null> {
    try {
      // Simple demo fallback - try to get stored business choice
      const { voiceRedisClient } = await import('../sessions/redisClient');
      const businessType = await voiceRedisClient.get('demo_choice:demo-user');

      if (businessType) {
        console.log(`🎯 [SessionService] Found demo business choice: ${businessType}`);
        const { getBusinessIdByCategory } = await import('@/features/shared/lib/demo-business-config');
        const { businessId } = getBusinessIdByCategory(businessType as BusinessCategory);

        const { BusinessRepository } = await import('@/features/shared/lib/database/repositories/business-repository');
        const businessRepository = new BusinessRepository();
        return await businessRepository.findOne({ id: businessId });
      }
    } catch (error) {
      console.log('🔍 [SessionService] Demo choice lookup failed (normal for production calls):', error);
    }
    return null;
  }

}
