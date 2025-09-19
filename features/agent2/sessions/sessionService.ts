import { sessionManager } from "./sessionManager";
import { Session } from "./session";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { TokenSpent } from "../types";
import { WebhookEvent } from "@/app/api/voice/twilio-webhook/route";

export class SessionService {
  static async createOrGet(callId: string, event: WebhookEvent) {
    let session = sessionManager.get(callId);

    if (session) {
      // Return existing session
      return session;
    } else {
      const sipHeaders = event.data.sip_headers!;
      const twilioAccountSid = this.extractTwilioAccountSid(sipHeaders);
      const phoneNumber = this.extractPhoneNumber(sipHeaders);
      const businessRepository = new BusinessRepository();
      const userRepository = new UserRepository();
      const [business, customer] = await Promise.all([
        businessRepository.findByTwilioAccountSid(twilioAccountSid!),
        userRepository.findOne({
          phone_number: phoneNumber
        })
      ]);

      session = {
        id: callId,
        businessId: "",
        businessEntity: business,
        customerPhoneNumber: phoneNumber,
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
        conversationState: 'service_selection'
      } as Session;

      sessionManager.add(session);

      // DB lookups

      if (business) {
        session.businessId = business.id;
        session.businessEntity = business;
      }

      if (customer) {
        session.customerId = customer.id;
      }
    }

    return session;
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
