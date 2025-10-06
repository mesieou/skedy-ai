import { sessionManager } from "./sessionSyncManager";
import { Session } from "./session";
// Dynamic import to avoid build-time evaluation
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
    let business: Business | null = null;

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

        let customer, phoneNumber;

        if (event.type === 'demo.session.create') {
          // Demo website chat: business_id provided in event data
          const businessId = event.data.business_id as string;
          assert(businessId, 'business_id required for demo sessions');

          business = await businessRepository.findOne({ id: businessId });
          assert(business, `Business not found for demo session: ${businessId}`);

          phoneNumber = ''; // No phone for demo
          customer = undefined; // No customer for demo

        } else if (event.type === 'realtime.call.incoming') {
          // All Twilio calls - check if demo from website first
          const sipHeaders = event.data.sip_headers;
          assert(sipHeaders, 'sip_headers required for Twilio sessions');

          phoneNumber = this.extractPhoneNumber(sipHeaders);

          // Check for demo business choice first
          const demoBusinessChoice = await this.tryFindDemoBusinessChoice();

          if (demoBusinessChoice) {
            // Demo call from website - use stored business choice
            console.log('🎭 [SessionService] Demo phone call from website detected');
            business = demoBusinessChoice;
          } else {
            // Real phone call - find by Twilio number
            const twilioNumber = this.extractTwilioNumber(sipHeaders);
            assert(twilioNumber, 'Twilio number not found in Diversion header');

            // Find businesses by Twilio number and category
            // Use findAll and take the first one to handle potential duplicates gracefully
            const businesses = await businessRepository.findAll({}, {
              twilio_number: twilioNumber,
            });

            if (businesses.length > 0) {
              business = businesses[0]; // Take the first matching business
              if (businesses.length > 1) {
                console.warn(`⚠️ [SessionService] Found ${businesses.length} businesses with Twilio number ${twilioNumber}. Using first one: ${business.name}`);
              }
            } else {
              business = null;
            }
          }

          customer = await userRepository.findOne({ phone_number: phoneNumber });
          assert(business, 'Business not found for phone call');

        } else {
          // Other event types (future expansion)
          throw new Error(`Unsupported event type: ${event.type}`);
        }

        // Assign API key index from business-specific pool when creating session
        const { BusinessWebSocketPool } = await import("./websocketPool");
        const poolAssignment = BusinessWebSocketPool.assign(business);
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
      if (typeof assignedApiKeyIndex === 'number' && business) {
        const { BusinessWebSocketPool } = await import("./websocketPool");
        BusinessWebSocketPool.release(business, assignedApiKeyIndex);
        console.log(`🔄 [SessionService] Released API key ${assignedApiKeyIndex + 1} due to session creation failure`);
      }

      throw error; // Re-throw so caller can handle
    }
  }

  private static extractTwilioNumber(sipHeaders: Array<{name: string; value: string}>): string | null {
    const header = sipHeaders.find(h => h.name === 'Diversion');
    if (header?.value) {
      // Extract phone number from Diversion header format: <sip:+61468031068@twilio.com>;reason=unconditional
      const phoneMatch = header.value.match(/sip:(\+\d+)@/);
      const extractedNumber = phoneMatch ? phoneMatch[1] : null;
      console.log('🔍 [SessionService] Extracted Twilio number from Diversion:', extractedNumber);
      console.log('🔍 [SessionService] Diversion header value:', header.value);
      return extractedNumber;
    }
    console.log('🔍 [SessionService] No Diversion header found');
    console.log('🔍 [SessionService] Sip Headers:', sipHeaders);
    return null;
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
        const business = await businessRepository.findOne({ id: businessId });
        return business;
      }
    } catch (error) {
      console.log('🔍 [SessionService] Demo choice lookup failed (normal for production calls):', error);
    }
    return null;
  }

}
