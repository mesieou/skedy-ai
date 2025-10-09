import Stripe from 'stripe';
import { BusinessRepository } from '@/features/shared/lib/database/repositories/business-repository';
import type { Session } from '@/features/agent/sessions/session';
import { sessionManager } from '@/features/agent/sessions/sessionSyncManager';
import { sentry } from '@/features/shared/utils/sentryService';
import type { PaymentLinkData, CreatePaymentLinkResult, CheckPaymentStatusResult } from './types';

let stripe: Stripe;

function getStripe(): Stripe {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.trim() === '') {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    stripe = new Stripe(stripeKey.trim(), {
      apiVersion: '2025-09-30.clover',
    });
  }
  return stripe;
}

export class StripePaymentService {
   /**
   * Creates a payment link for the selected quote in the session
   * Extracts all necessary data from the session
   */
  static async createPaymentLinkForSession(session: Session): Promise<CreatePaymentLinkResult> {
    try {
      // Validate session has required data
      if (!session.selectedQuote) {
        return {
          success: false,
          error: 'No quote selected in session'
        };
      }

      if (!session.customerEntity) {
        return {
          success: false,
          error: 'No customer data in session'
        };
      }

      const quoteResult = session.selectedQuote.result;
      const quoteRequest = session.selectedQuote.request;
      const business = session.businessEntity;
      const user = session.customerEntity;

      // Build payment data from session
      const paymentDataResult = this._buildPaymentLinkData({
        quoteId: quoteResult.quote_id,
        customerId: user.id,
        businessId: business.id,
        serviceDescription: quoteRequest.services[0]?.service?.name || 'Service',
        businessName: business.name,
        customerName: `${user.first_name} ${user.last_name || ''}`.trim(),
        depositAmount: quoteResult.deposit_amount || 0,
        platformFee: quoteResult.price_breakdown?.business_fees?.platform_fee || 0,
      });

      // Check if validation failed
      if ('success' in paymentDataResult && !paymentDataResult.success) {
        return paymentDataResult;
      }

      return await this._createStripePaymentLink(paymentDataResult as PaymentLinkData);
    } catch (err) {
      console.error('Error creating payment link for session:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create payment link',
      };
    }
  }

  /**
   * Creates a Stripe Payment Link for a quote with split payment
   * Platform fee goes to Skedy, remainder goes to business via Stripe Connect
   */
  private static async _createStripePaymentLink(data: PaymentLinkData): Promise<CreatePaymentLinkResult> {
    try {
      console.log(`💳 [StripePaymentService] Starting payment link creation for business: ${data.businessId}`);

      // Validate business has Stripe Connect account
      const businessRepo = new BusinessRepository();
      const business = await businessRepo.findOne({ id: data.businessId });

      if (!business) {
        console.error(`💳 [StripePaymentService] Business not found: ${data.businessId}`);
        return {
          success: false,
          error: 'Business not found'
        };
      }

      console.log(`💳 [StripePaymentService] Business found: ${business.name}`);
      console.log(`💳 [StripePaymentService] Stripe Connect Account ID: ${business.stripe_connect_account_id || 'NOT SET'}`);
      console.log(`💳 [StripePaymentService] Stripe Account Status: ${business.stripe_account_status || 'NOT SET'}`);

      if (!business.stripe_connect_account_id || business.stripe_account_status !== 'active') {
        console.error(`💳 [StripePaymentService] Business payment account not configured properly`);
        console.error(`💳 [StripePaymentService] - Connect Account ID: ${business.stripe_connect_account_id || 'MISSING'}`);
        console.error(`💳 [StripePaymentService] - Account Status: ${business.stripe_account_status || 'MISSING'}`);
        return {
          success: false,
          error: 'Business payment account not configured'
        };
      }

      const depositAmountCents = Math.round(data.depositAmount * 100);
      const totalAmountCents = depositAmountCents; // All fees already included in quote

      console.log(`💳 [StripePaymentService] Payment amounts - Deposit: $${data.depositAmount} (${depositAmountCents} cents), Platform fee: $${data.platformFee}`);

      // Create a price first, then use it in the payment link
      console.log(`💳 [StripePaymentService] Creating Stripe price for: ${data.serviceDescription}`);
      const price = await getStripe().prices.create({
        currency: 'aud',
        product_data: {
          name: `${data.serviceDescription} - Booking Deposit`,
          metadata: {
            quoteId: data.quoteId,
            businessId: data.businessId,
            customerId: data.customerId,
            businessName: data.businessName,
            serviceDescription: data.serviceDescription,
            depositAmount: data.depositAmount.toString(),
            platformFee: data.platformFee.toString(),
            type: 'booking_deposit',
          },
        },
        unit_amount: totalAmountCents,
      });
      console.log(`💳 [StripePaymentService] Created Stripe price: ${price.id}`);

      // Create payment link with application fee (split payment)
      console.log(`💳 [StripePaymentService] Creating payment link with Connect account: ${business.stripe_connect_account_id}`);
      console.log(`💳 [StripePaymentService] Application fee amount: ${Math.round(data.platformFee * 100)} cents`);

      const paymentLink = await getStripe().paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        application_fee_amount: Math.round(data.platformFee * 100), // Platform fee goes to Skedy
        on_behalf_of: business.stripe_connect_account_id, // Business gets the rest
        transfer_data: {
          destination: business.stripe_connect_account_id,
        },
        metadata: {
          type: 'booking_deposit',
          quoteId: data.quoteId,
          customerId: data.customerId,
          businessId: data.businessId,
        },
        after_completion: {
          type: 'hosted_confirmation',
          hosted_confirmation: {
            custom_message: 'Payment completed successfully! You can now return to your conversation to complete your booking.',
          },
        },
      });
      console.log(`💳 [StripePaymentService] Successfully created payment link: ${paymentLink.url}`);

      return {
        success: true,
        paymentLink: paymentLink.url,
      };
    } catch (err) {
      console.error('💳 [StripePaymentService] Error creating Stripe payment link:', err);

      // Log detailed error information
      if (err && typeof err === 'object') {
        const stripeError = err as any;
        console.error(`💳 [StripePaymentService] Stripe Error Details:`);
        console.error(`💳 [StripePaymentService] - Type: ${stripeError.type || 'unknown'}`);
        console.error(`💳 [StripePaymentService] - Code: ${stripeError.code || 'unknown'}`);
        console.error(`💳 [StripePaymentService] - Param: ${stripeError.param || 'unknown'}`);
        console.error(`💳 [StripePaymentService] - Message: ${stripeError.message || 'unknown'}`);
        console.error(`💳 [StripePaymentService] - Request ID: ${stripeError.requestId || 'unknown'}`);

        if (stripeError.param === 'on_behalf_of' || stripeError.code === 'resource_missing') {
          console.error(`💳 [StripePaymentService] ISSUE: The Stripe Connect account ID appears to be invalid or deleted`);
          console.error(`💳 [StripePaymentService] - Business ID: ${data.businessId}`);
          console.error(`💳 [StripePaymentService] - Business Name: ${data.businessName}`);
        }
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create payment link',
      };
    }
  }

  /**
   * Check payment status for the selected quote in the session
   */
  static checkPaymentStatus(session: Session): CheckPaymentStatusResult {
    try {
      // Validate that we have a selected quote
      if (!session.selectedQuote) {
        return {
          success: false,
          error: 'No quote selected'
        };
      }

      const quoteId = session.selectedQuote.result.quote_id;

      // Check if there's a payment state for this quote
      if (!session.depositPaymentState || session.depositPaymentState.quoteId !== quoteId) {
        return {
          success: false,
          error: 'No payment found for current quote'
        };
      }

      const paymentState = session.depositPaymentState;

      // Return payment status information
      switch (paymentState.status) {
        case 'completed':
          return {
            success: true,
            data: {
              payment_status: 'completed',
              quote_id: quoteId,
              amount: paymentState.amount,
              stripe_session_id: paymentState.stripeSessionId
            }
          };

        case 'pending':
          return {
            success: true,
            data: {
              payment_status: 'pending',
              quote_id: quoteId,
              amount: paymentState.amount,
              payment_link: paymentState.paymentLink
            }
          };

        case 'failed':
          return {
            success: true,
            data: {
              payment_status: 'failed',
              quote_id: quoteId,
              amount: paymentState.amount
            }
          };

        default:
          return {
            success: false,
            error: 'Unknown payment status for current quote'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Builds PaymentLinkData with common validation logic
   */
  private static _buildPaymentLinkData(data: {
    quoteId: string;
    customerId: string;
    businessId: string;
    serviceDescription: string;
    businessName: string;
    customerName: string;
    depositAmount: number;
    platformFee: number;
  }): PaymentLinkData | { success: false; error: string } {
    // If no deposit amount (business doesn't require deposits), don't create payment link
    if (data.depositAmount === 0) {
      return {
        success: false,
        error: 'This business does not require deposit payments'
      };
    }

    return {
      quoteId: data.quoteId,
      customerId: data.customerId,
      businessId: data.businessId,
      serviceDescription: data.serviceDescription,
      businessName: data.businessName,
      customerName: data.customerName,
      depositAmount: data.depositAmount,
      platformFee: data.platformFee,
    };
  }

  /**
   * Handles successful payment completion
   */
  private static async _handlePaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const quoteId = session.metadata?.quoteId;
      if (!quoteId) {
        console.error('❌ [Stripe Webhook] No quote ID found in payment session metadata');
        console.log('📋 [Stripe Webhook] Session metadata:', session.metadata);
        return;
      }

      console.log(`🎉 [Stripe Webhook] Processing payment completion for quote: ${quoteId}`);
      console.log(`💳 [Stripe Webhook] Stripe session ID: ${session.id}`);
      console.log(`💰 [Stripe Webhook] Amount: ${session.amount_total ? session.amount_total / 100 : 'N/A'}`);

      // In Skedy AI, quotes are stored in sessions, not database
      // Just update the session payment state
      this._updateSessionPaymentState(quoteId, 'completed', session.id);

      console.log(`✅ [Stripe Webhook] Successfully processed payment completion for quote: ${quoteId}`);
    } catch (error) {
      console.error('❌ [Stripe Webhook] Error handling payment completion:', error);
      throw error;
    }
  }

  /**
   * Handles failed payment
   */
  private static async _handlePaymentFailed(paymentObject: Stripe.PaymentIntent | Stripe.Checkout.Session): Promise<void> {
    try {
      const quoteId = paymentObject.metadata?.quoteId;
      if (!quoteId) {
        console.error('No quote ID found in payment object metadata');
        return;
      }

      console.log(`Payment failed for quote: ${quoteId}`);
      // You might want to update the quote status or send a notification
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Handles async payment failed (delayed payment method failed)
   */
  private static async _handleAsyncPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const quoteId = session.metadata?.quoteId;
      if (!quoteId) {
        console.error('[Stripe Webhook] No quote ID found in async payment failed session metadata');
        return;
      }

      console.log(`[Stripe Webhook] Async payment failed for quote: ${quoteId}`);

      // In Skedy AI, quotes are stored in sessions, not database
      // Just update the session payment state
      this._updateSessionPaymentState(quoteId, 'failed', session.id);

      console.log(`[Stripe Webhook] Successfully updated session payment state to failed for quote: ${quoteId}`);
    } catch (error) {
      console.error('Error handling async payment failure:', error);
      throw error;
    }
  }

  /**
   * Handles async payment succeeded (delayed payment method finally succeeded)
   */
  private static async _handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const quoteId = session.metadata?.quoteId;
      if (!quoteId) {
        console.error('[Stripe Webhook] No quote ID found in async payment succeeded session metadata');
        return;
      }

      console.log(`[Stripe Webhook] Async payment succeeded for quote: ${quoteId}`);

      // In Skedy AI, quotes are stored in sessions, not database
      // Just update the session payment state
      this._updateSessionPaymentState(quoteId, 'completed', session.id);

      console.log(`[Stripe Webhook] Successfully updated session payment state to completed for quote: ${quoteId} (async payment succeeded)`);
    } catch (error) {
      console.error('Error handling async payment success:', error);
      throw error;
    }
  }

  /**
   * Updates session payment state for a given quote
   */
  private static _updateSessionPaymentState(quoteId: string, status: 'completed' | 'failed', stripeSessionId: string): void {
    try {
      // Find session by quote ID in metadata
      const sessions = sessionManager.list();
      console.log(`🔍 [Webhook] Looking for quote ${quoteId} in ${sessions.length} active sessions`);

      // Debug: log all session quote IDs
      sessions.forEach((s, index) => {
        console.log(`📋 [Webhook] Session ${index + 1}: ${s.id} - Quote: ${s.depositPaymentState?.quoteId || 'none'}`);
      });

      const targetSession = sessions.find((s) =>
        s.depositPaymentState?.quoteId === quoteId
      );

      if (targetSession) {
        // Update payment state
        targetSession.depositPaymentState = {
          ...targetSession.depositPaymentState!,
          status,
          stripeSessionId,
          amount: targetSession.depositPaymentState!.amount
        };


        const emoji = status === 'completed' ? '✅' : '❌';
        console.log(`${emoji} Updated session ${targetSession.id} payment state to ${status} for quote ${quoteId}`);

        // Add breadcrumb for session update
        sentry.addBreadcrumb(`Payment ${status} and session updated`, 'stripe-webhook', {
          sessionId: targetSession.id,
          businessId: targetSession.businessId,
          quoteId: quoteId,
          stripeSessionId: stripeSessionId,
          status: status
        });
      } else {
        console.log(`⚠️ [Webhook] No session found for quote ${quoteId} among ${sessions.length} active sessions`);
      }
    } catch (error) {
      console.error('Error updating session payment state:', error);
      // Don't throw - this is not critical enough to fail the webhook
    }
  }

  /**
   * Handles payment link created event
   */
  private static async _handlePaymentLinkCreated(paymentLink: Stripe.PaymentLink): Promise<void> {
    try {
      const quoteId = paymentLink.metadata?.quoteId;
      if (!quoteId) {
        console.error('[Stripe Webhook] No quote ID found in payment link metadata');
        return;
      }

      console.log(`[Stripe Webhook] Payment link created for quote: ${quoteId}`, {
        paymentLinkId: paymentLink.id,
        url: paymentLink.url,
        active: paymentLink.active,
        metadata: paymentLink.metadata
      });

      // In Skedy AI, quotes are stored in sessions, not database
      // Payment link info is already available in the session when created
      // No need to update database, just log the event
      console.log(`[Stripe Webhook] Payment link creation logged for quote: ${quoteId}`);
    } catch (error) {
      console.error('Error handling payment link creation:', error);
      throw error;
    }
  }

  /**
   * Creates a Stripe Express account for a business
   */
  static async createExpressAccount(businessId: string, forceNew: boolean = false): Promise<{success: boolean, accountId?: string, error?: string}> {
    try {
      const businessRepo = new BusinessRepository();
      const business = await businessRepo.findOne({ id: businessId });

      if (!business) {
        return {
          success: false,
          error: 'Business not found'
        };
      }

      // Check if account already exists (unless forcing new)
      if (business.stripe_connect_account_id && !forceNew) {
        return {
          success: true,
          accountId: business.stripe_connect_account_id
        };
      }

      // Create Express account with required capabilities for payment links with on_behalf_of
      const account = await getStripe().accounts.create({
        type: 'express',
        country: 'AU',
        email: business.email,
        business_profile: {
          name: business.name,
          url: business.website_url || undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          businessId: businessId,
          businessName: business.name,
        },
      });

      // Update business with account ID
      await businessRepo.updateOne(
        { id: businessId },
        {
          stripe_connect_account_id: account.id,
          stripe_account_status: 'pending',
        }
      );

      return {
        success: true,
        accountId: account.id
      };
    } catch (error) {
      console.error('Error creating Stripe Express account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Express account'
      };
    }
  }

  /**
   * Creates an onboarding link for Express account setup
   * Automatically creates a fresh account if current one is disabled
   */
  static async createOnboardingLink(businessId: string): Promise<{success: boolean, url?: string, error?: string}> {
    try {
      const businessRepo = new BusinessRepository();
      const business = await businessRepo.findOne({ id: businessId });

      if (!business) {
        return {
          success: false,
          error: 'Business not found'
        };
      }

      let accountId = business.stripe_connect_account_id;
      let needsFreshAccount = false;

      // Check if existing account is disabled
      if (accountId) {
        try {
          const account = await getStripe().accounts.retrieve(accountId);
          if (account.requirements?.disabled_reason) {
            console.log(`Account ${accountId} is disabled: ${account.requirements.disabled_reason}. Creating fresh account.`);
            needsFreshAccount = true;
          }
        } catch {
          console.log(`Account ${accountId} not found or error retrieving. Creating fresh account.`);
          needsFreshAccount = true;
        }
      }

      // Create account if it doesn't exist or if current one is disabled
      if (!accountId || needsFreshAccount) {
        const accountResult = await this.createExpressAccount(businessId, true); // Force new account
        if (!accountResult.success) {
          return accountResult;
        }
        accountId = accountResult.accountId!;
        console.log(`Created fresh Stripe account: ${accountId}`);
      }

      // Create onboarding link
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skedy.io';
      const accountLink = await getStripe().accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/onboarding?refresh=true&businessId=${businessId}`,
        return_url: `${baseUrl}/onboarding?success=true&businessId=${businessId}`,
        type: 'account_onboarding',
      });

      return {
        success: true,
        url: accountLink.url
      };
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create onboarding link'
      };
    }
  }

  /**
   * Checks and updates account status
   */
  static async updateAccountStatus(businessId: string): Promise<{success: boolean, status?: string, error?: string}> {
    try {
      const businessRepo = new BusinessRepository();
      const business = await businessRepo.findOne({ id: businessId });

      if (!business) {
        return {
          success: false,
          error: 'Business not found'
        };
      }

      if (!business.stripe_connect_account_id) {
        return {
          success: false,
          error: 'No Stripe account found for business'
        };
      }

      // Retrieve account details from Stripe
      const account = await getStripe().accounts.retrieve(business.stripe_connect_account_id);

      let status: 'pending' | 'active' | 'disabled' = 'pending';

      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        status = 'active';
      } else if (account.requirements?.disabled_reason) {
        status = 'disabled';
      }

      // Update business with new status
      await businessRepo.updateOne(
        { id: businessId },
        {
          stripe_account_status: status,
        }
      );

      return {
        success: true,
        status: status
      };
    } catch (error) {
      console.error('Error updating account status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update account status'
      };
    }
  }

  /**
   * Handles Stripe webhook events
   */
  static async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      console.log(`🔔 [Stripe Webhook] Received event: ${event.type}`);
      switch (event.type) {
        case 'checkout.session.completed':
          console.log(`🔄 [Stripe Webhook] Calling _handlePaymentCompleted for event ${event.id}`);
          await this._handlePaymentCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'checkout.session.async_payment_failed':
          await this._handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
          break;
        case 'checkout.session.async_payment_succeeded':
          await this._handleAsyncPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_link.created':
          await this._handlePaymentLinkCreated(event.data.object as Stripe.PaymentLink);
          break;
        case 'payment_intent.payment_failed':
          await this._handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'checkout.session.expired':
          await this._handlePaymentFailed(event.data.object as Stripe.Checkout.Session);
          break;
        case 'account.updated':
          await this._handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling Stripe webhook event:', error);

      // Only re-throw errors for critical payment events that should cause webhook failures
      // Account updates and other non-critical events should not fail the webhook
      const criticalEvents = [
        'checkout.session.completed',
        'checkout.session.async_payment_failed',
        'checkout.session.async_payment_succeeded',
        'payment_intent.payment_failed',
        'checkout.session.expired'
      ];

      if (criticalEvents.includes(event.type)) {
        throw error;
      }

      // For non-critical events, log the error but don't fail the webhook
      console.log(`Non-critical webhook event ${event.type} failed, but continuing to prevent webhook retry loops`);
    }
  }

  /**
   * Handles account status updates from webhooks
   */
  private static async _handleAccountUpdated(account: Stripe.Account): Promise<void> {
    try {
      const businessId = account.metadata?.businessId;
      if (!businessId) {
        console.log(`Skipping account update for ${account.id}: No business ID found in metadata (likely external account)`);
        return;
      }

      let status: 'pending' | 'active' | 'disabled' = 'pending';

      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        status = 'active';
      } else if (account.requirements?.disabled_reason) {
        status = 'disabled';
      }

      // Check if business exists before updating
      const businessRepo = new BusinessRepository();
      const existingBusiness = await businessRepo.findOne({ id: businessId });

      if (!existingBusiness) {
        console.log(`Skipping account update for ${account.id}: Business ${businessId} not found in database (may have been deleted)`);
        return;
      }

      // Update business status
      await businessRepo.updateOne(
        { id: businessId },
        {
          stripe_account_status: status,
        }
      );

      console.log(`Updated business ${businessId} Stripe account status to: ${status}`);
    } catch (err) {
      console.error('Error handling account update:', err);
      // Don't re-throw the error to prevent webhook failures for non-critical updates
      // The webhook will still return success, but we log the error for monitoring
    }
  }

  /**
   * Verifies webhook signature from Stripe
   * Tries both webhook secrets (Your Account and Connected Accounts)
   */
  static verifyStripeWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event | null {
    const secrets = [
      process.env.STRIPE_WEBHOOK_SECRET,           // Your existing secret
      process.env.STRIPE_WEBHOOK_SECRET_MAIN       // New secret for "Your Account" webhook
    ].filter(Boolean);

    if (secrets.length === 0) {
      console.error('No Stripe webhook secrets configured');
      return null;
    }

    // Try each secret until one works
    for (const secret of secrets) {
      try {
        const event = getStripe().webhooks.constructEvent(payload, signature, secret!);
        console.log(`✅ Webhook signature verified with secret: ${secret!.substring(0, 12)}...`);
        return event;
      } catch {
        console.log(`❌ Signature verification failed with secret: ${secret!.substring(0, 12)}...`);
        continue;
      }
    }

    console.error('All webhook signature verifications failed');
    return null;
  }
}

export default StripePaymentService;
