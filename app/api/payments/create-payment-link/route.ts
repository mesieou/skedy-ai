import { NextRequest, NextResponse } from "next/server";
import { StripePaymentService } from "@/features/payments/stripe-utils";
import { sentry } from "@/features/shared/utils/sentryService";
import { sessionManager } from "@/features/agent/sessions/sessionSyncManager";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log(`[Payment API] Creating payment link for session: ${sessionId}`);

    // Add breadcrumb for payment link creation
    sentry.addBreadcrumb('Creating payment link via API', 'payment-api', {
      sessionId: sessionId,
      method: 'POST'
    });

    // Get session from session manager
    const targetSession = await sessionManager.get(sessionId);

    if (!targetSession) {
      console.error(`[Payment API] Session not found: ${sessionId}`);

      // Track error for missing session
      sentry.trackError(new Error('Session not found'), {
        sessionId: sessionId,
        operation: 'payment_api_create_link',
        metadata: {
          sessionId: sessionId,
          errorMessage: 'Session not found'
        }
      });

      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    console.log(`[Payment API] Found session ${targetSession.id} with quote: ${targetSession.selectedQuote?.result.quote_id}`);

    const result = await StripePaymentService.createPaymentLinkForSession(targetSession);

    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`[Payment API] Failed to create payment link: ${result.error}`);

      // Track payment link creation error
      sentry.trackError(new Error(result.error || 'Payment link creation failed'), {
        sessionId: 'api-payment-link',
        operation: 'payment_api_create_link',
        metadata: {
          duration: duration,
          sessionId: sessionId,
          errorMessage: result.error
        }
      });

      return NextResponse.json(
        { error: result.error || "Failed to create payment link" },
        { status: 500 }
      );
    }

    console.log(`[Payment API] Successfully created payment link for session: ${sessionId}`);

    // Success breadcrumb
    sentry.addBreadcrumb('Payment link created successfully via API', 'payment-api', {
      sessionId: sessionId,
      duration: duration
    });

    return NextResponse.json({
      success: true,
      paymentLink: result.paymentLink,
      sessionId,
      quoteId: targetSession.selectedQuote?.result.quote_id
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[Payment API] Error creating payment link:", error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'api-payment-link',
      operation: 'payment_api_create_link',
      metadata: {
        duration: duration
      }
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Payment Link Creation API",
    usage: {
      method: "POST",
      body: {
        sessionId: "string - Required. The ID of the session to create payment for"
      },
      response: {
        success: "boolean",
        paymentLink: "string - Stripe payment link URL",
        sessionId: "string - Session ID that was processed",
        quoteId: "string - Quote ID from the session"
      }
    },
    environment: {
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
    }
  });
}
