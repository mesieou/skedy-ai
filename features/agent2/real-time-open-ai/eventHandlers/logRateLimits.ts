import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { ServerRateLimitsUpdatedEvent } from "../types/server/events/rateLimints/serverRateLimitsUpdatedTypes";

export async function logRateLimits(
  session: Session,
  event: ServerRateLimitsUpdatedEvent
): Promise<void> {
  const rateLimits = event.rate_limits;

  // Log rate limits in a simple format
  const limitSummary = rateLimits.map(limit =>
    `${limit.name}: ${limit.remaining}/${limit.limit} (reset: ${limit.reset_seconds}s)`
  ).join(' | ');

  console.log(`📊 [RateLimits] Session ${session.id} | ${limitSummary}`);

  // Add breadcrumb for rate limits
  sentry.addBreadcrumb(`Rate limits updated`, 'rate-limits', {
    sessionId: session.id,
    businessId: session.businessId,
    conversationId: session.openAiConversationId,
    rateLimits: rateLimits
  });
}
