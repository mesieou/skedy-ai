import { StripePaymentService } from '../stripe-utils';
import type { Session } from '@/features/agent/sessions/session';
import type { Business } from '@/features/shared/lib/database/types/business';
import type { User } from '@/features/shared/lib/database/types/user';
import { BusinessRepository } from '@/features/shared/lib/database/repositories/business-repository';
import { sessionManager } from '@/features/agent/sessions/sessionSyncManager';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/features/shared/lib/database/repositories/business-repository');
jest.mock('@/features/agent/sessions/sessionSyncManager');
jest.mock('@/features/shared/utils/sentryService');

// Mock Stripe
const mockStripeInstance = {
  paymentLinks: {
    create: jest.fn(),
  },
  prices: {
    create: jest.fn(),
  },
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  accountLinks: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

describe('StripePaymentService', () => {
  let mockSession: Session;
  let mockBusiness: Business;
  let mockUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock business
    mockBusiness = {
      id: 'business_123',
      name: 'Test Business',
      email: 'test@business.com',
      stripe_connect_account_id: 'acct_test_123',
      stripe_account_status: 'active',
      whatsapp_number: '+1234567890',
    } as Business;

    // Mock user
    mockUser = {
      id: 'user_123',
      first_name: 'John',
      last_name: 'Doe',
    } as User;

    // Mock session
    mockSession = {
      id: 'session_123',
      businessId: 'business_123',
      businessEntity: mockBusiness,
      customerEntity: mockUser,
      selectedQuote: {
        result: {
          quote_id: 'quote_123',
          deposit_amount: 100,
          price_breakdown: {
            business_fees: {
              platform_fee: 10,
            },
          },
        },
        request: {
          services: [
            {
              service: {
                name: 'Test Service',
              },
            },
          ],
        },
      },
      depositPaymentState: {
        status: 'pending' as const,
        quoteId: 'quote_123',
        amount: 100,
        createdAt: Date.now(),
      },
    } as Session;

    // Mock environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
  });

  describe('createPaymentLinkForSession', () => {
    it('should create payment link successfully', async () => {
      const mockPaymentLink = {
        id: 'plink_123',
        url: 'https://buy.stripe.com/test_123',
      };

      const mockPrice = {
        id: 'price_123',
      };

      // Mock Stripe methods
      mockStripeInstance.prices.create.mockResolvedValue(mockPrice);
      mockStripeInstance.paymentLinks.create.mockResolvedValue(mockPaymentLink);

      // Mock business repository
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(mockBusiness);

      const result = await StripePaymentService.createPaymentLinkForSession(mockSession);

      expect(result.success).toBe(true);
      expect(result.paymentLink).toBe('https://buy.stripe.com/test_123');
      expect(mockStripeInstance.prices.create).toHaveBeenCalledWith({
        currency: 'aud',
        product_data: {
          name: 'Test Service - Booking Deposit',
          metadata: {
            quoteId: 'quote_123',
            businessId: 'business_123',
            customerId: 'user_123',
            businessName: 'Test Business',
            serviceDescription: 'Test Service',
            depositAmount: '100',
            platformFee: '10',
            type: 'booking_deposit',
          },
        },
        unit_amount: 10000, // 100 AUD in cents
      });
    });

    it('should fail when no quote is selected', async () => {
      const sessionWithoutQuote = { ...mockSession, selectedQuote: undefined };

      const result = await StripePaymentService.createPaymentLinkForSession(sessionWithoutQuote);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No quote selected in session');
    });

    it('should fail when no customer data', async () => {
      const sessionWithoutCustomer = { ...mockSession, customerEntity: undefined };

      const result = await StripePaymentService.createPaymentLinkForSession(sessionWithoutCustomer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No customer data in session');
    });

    it('should fail when business has no Stripe account', async () => {
      const businessWithoutStripe = {
        ...mockBusiness,
        stripe_connect_account_id: null,
      };

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(businessWithoutStripe);

      const result = await StripePaymentService.createPaymentLinkForSession(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Business payment account not configured');
    });

    it('should fail when deposit amount is zero', async () => {
      const sessionWithZeroDeposit = {
        ...mockSession,
        selectedQuote: {
          ...mockSession.selectedQuote!,
          result: {
            ...mockSession.selectedQuote!.result,
            deposit_amount: 0,
          },
        },
      };

      const result = await StripePaymentService.createPaymentLinkForSession(sessionWithZeroDeposit);

      expect(result.success).toBe(false);
      expect(result.error).toBe('This business does not require deposit payments');
    });
  });

  describe('checkPaymentStatus', () => {
    it('should return completed status', () => {
      const sessionWithCompletedPayment = {
        ...mockSession,
        depositPaymentState: {
          status: 'completed' as const,
          quoteId: 'quote_123',
          amount: 100,
          stripeSessionId: 'cs_test_123',
          createdAt: Date.now(),
        },
      };

      const result = StripePaymentService.checkPaymentStatus(sessionWithCompletedPayment);

      expect(result.success).toBe(true);
      expect(result.data?.payment_status).toBe('completed');
      expect(result.data?.stripe_session_id).toBe('cs_test_123');
    });

    it('should return pending status', () => {
      const sessionWithPendingPayment = {
        ...mockSession,
        depositPaymentState: {
          status: 'pending' as const,
          quoteId: 'quote_123',
          amount: 100,
          paymentLink: 'https://buy.stripe.com/test_123',
          createdAt: Date.now(),
        },
      };

      const result = StripePaymentService.checkPaymentStatus(sessionWithPendingPayment);

      expect(result.success).toBe(true);
      expect(result.data?.payment_status).toBe('pending');
      expect(result.data?.payment_link).toBe('https://buy.stripe.com/test_123');
    });

    it('should return failed status', () => {
      const sessionWithFailedPayment = {
        ...mockSession,
        depositPaymentState: {
          status: 'failed' as const,
          quoteId: 'quote_123',
          amount: 100,
          createdAt: Date.now(),
        },
      };

      const result = StripePaymentService.checkPaymentStatus(sessionWithFailedPayment);

      expect(result.success).toBe(true);
      expect(result.data?.payment_status).toBe('failed');
    });

    it('should fail when no quote is selected', () => {
      const sessionWithoutQuote = { ...mockSession, selectedQuote: undefined };

      const result = StripePaymentService.checkPaymentStatus(sessionWithoutQuote);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No quote selected');
    });

    it('should fail when no payment state exists', () => {
      const sessionWithoutPaymentState = { ...mockSession, depositPaymentState: undefined };

      const result = StripePaymentService.checkPaymentStatus(sessionWithoutPaymentState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No payment found for current quote');
    });

    it('should fail when payment state quote ID does not match', () => {
      const sessionWithMismatchedQuote = {
        ...mockSession,
        depositPaymentState: {
          status: 'pending' as const,
          quoteId: 'different_quote',
          amount: 100,
          createdAt: Date.now(),
        },
      };

      const result = StripePaymentService.checkPaymentStatus(sessionWithMismatchedQuote);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No payment found for current quote');
    });
  });

  describe('createExpressAccount', () => {
    it('should create new Express account', async () => {
      const mockAccount = {
        id: 'acct_new_123',
      };

      // Mock business without existing account
      const businessWithoutAccount = {
        ...mockBusiness,
        stripe_connect_account_id: null,
      };

      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount);

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(businessWithoutAccount);
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.updateOne.mockResolvedValue(mockBusiness);

      const result = await StripePaymentService.createExpressAccount('business_123');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('acct_new_123');
      expect(mockStripeInstance.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'AU',
        email: 'test@business.com',
        business_profile: {
          name: 'Test Business',
          url: undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          businessId: 'business_123',
          businessName: 'Test Business',
        },
      });
    });

    it('should return existing account if it exists', async () => {
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(mockBusiness);

      const result = await StripePaymentService.createExpressAccount('business_123');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('acct_test_123');
    });

    it('should fail when business not found', async () => {
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(null);

      const result = await StripePaymentService.createExpressAccount('invalid_business');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Business not found');
    });
  });

  describe('createOnboardingLink', () => {
    it('should create onboarding link for existing account', async () => {
      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/test_123',
      };

      mockStripeInstance.accounts.retrieve.mockResolvedValue({
        id: 'acct_test_123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: { disabled_reason: null },
      });
      mockStripeInstance.accountLinks.create.mockResolvedValue(mockAccountLink);

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(mockBusiness);

      process.env.NEXT_PUBLIC_SITE_URL = 'https://test.com';

      const result = await StripePaymentService.createOnboardingLink('business_123');

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://connect.stripe.com/setup/test_123');
    });

    it('should create fresh account and onboarding link when account is disabled', async () => {
      const mockAccount = { id: 'acct_new_123' };
      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/test_123',
      };

      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount);
      mockStripeInstance.accounts.retrieve.mockResolvedValue({
        id: 'acct_test_123',
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: { disabled_reason: 'requirements.past_due' },
      });
      mockStripeInstance.accountLinks.create.mockResolvedValue(mockAccountLink);

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(mockBusiness);
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.updateOne.mockResolvedValue(mockBusiness);

      const result = await StripePaymentService.createOnboardingLink('business_123');

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://connect.stripe.com/setup/test_123');
    });
  });

  describe('updateAccountStatus', () => {
    it('should update account status to active', async () => {
      mockStripeInstance.accounts.retrieve.mockResolvedValue({
        id: 'acct_test_123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: { disabled_reason: null },
      });

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(mockBusiness);
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.updateOne.mockResolvedValue(mockBusiness);

      const result = await StripePaymentService.updateAccountStatus('business_123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('active');
    });

    it('should update account status to disabled', async () => {
      mockStripeInstance.accounts.retrieve.mockResolvedValue({
        id: 'acct_test_123',
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: { disabled_reason: 'requirements.past_due' },
      });

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(mockBusiness);
      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.updateOne.mockResolvedValue(mockBusiness);

      const result = await StripePaymentService.updateAccountStatus('business_123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('disabled');
    });

    it('should fail when business has no Stripe account', async () => {
      const businessWithoutStripe = {
        ...mockBusiness,
        stripe_connect_account_id: null,
      };

      (BusinessRepository as jest.MockedClass<typeof BusinessRepository>).prototype.findOne.mockResolvedValue(businessWithoutStripe);

      const result = await StripePaymentService.updateAccountStatus('business_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No Stripe account found for business');
    });
  });

  describe('verifyStripeWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: { object: {} },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = StripePaymentService.verifyStripeWebhookSignature(
        'test_payload',
        'test_signature'
      );

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        'test_payload',
        'test_signature',
        'whsec_123'
      );
    });

    it('should return null when webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const result = StripePaymentService.verifyStripeWebhookSignature(
        'test_payload',
        'test_signature'
      );

      expect(result).toBeNull();
    });

    it('should return null when signature verification fails', () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = StripePaymentService.verifyStripeWebhookSignature(
        'test_payload',
        'invalid_signature'
      );

      expect(result).toBeNull();
    });
  });

  describe('handleStripeWebhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { quoteId: 'quote_123' },
          },
        },
        api_version: '2025-09-30.clover',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test_123', idempotency_key: null },
      } as unknown as Stripe.Event;

      // Mock session manager
      (sessionManager as jest.Mocked<typeof sessionManager>).list.mockReturnValue([mockSession]);

      await StripePaymentService.handleStripeWebhook(mockEvent);

      // Verify session was updated
      expect(mockSession.depositPaymentState?.status).toBe('completed');
      expect(mockSession.depositPaymentState?.stripeSessionId).toBe('cs_test_123');
    });

    it('should handle checkout.session.async_payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.async_payment_failed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { quoteId: 'quote_123' },
          },
        },
        api_version: '2025-09-30.clover',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test_123', idempotency_key: null },
      } as unknown as Stripe.Event;

      (sessionManager as jest.Mocked<typeof sessionManager>).list.mockReturnValue([mockSession]);

      await StripePaymentService.handleStripeWebhook(mockEvent);

      expect(mockSession.depositPaymentState?.status).toBe('failed');
    });

    it('should handle payment_link.created event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_link.created',
        data: {
          object: {
            id: 'plink_123',
            url: 'https://buy.stripe.com/test_123',
            active: true,
            metadata: { quoteId: 'quote_123' },
          },
        },
        api_version: '2025-09-30.clover',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test_123', idempotency_key: null },
      } as unknown as Stripe.Event;

      // This should just log the event, no session updates
      await expect(
        StripePaymentService.handleStripeWebhook(mockEvent)
      ).resolves.not.toThrow();
    });

    it('should handle unhandled event types', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'unknown.event.type',
        data: { object: {} },
        api_version: '2025-09-30.clover',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: 'req_test_123', idempotency_key: null },
      } as unknown as Stripe.Event;

      // Should not throw, just log unhandled event
      await expect(
        StripePaymentService.handleStripeWebhook(mockEvent)
      ).resolves.not.toThrow();
    });
  });
});
