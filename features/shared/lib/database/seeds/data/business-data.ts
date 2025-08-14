import type { CreateBusinessData } from '../../types/business';
import { BusinessCategory, SubscriptionType, PaymentMethod, DepositType } from '../../types/business';

// Test business data for seeding
export const removalistBusinessData: CreateBusinessData = {
  name: "Tiga Removals",
  email: "edward@tigapropertyservices.com",
  phone_number: "+61473164581",
  address: "123 Collins Street, Melbourne VIC 3000, Australia",
  time_zone: "Australia/Melbourne",
  language: "en",
  business_category: BusinessCategory.TRANSPORT,
  charges_gst: true,
  gst_rate: 10.00,
  charges_deposit: true,
  payment_processing_fee_percentage: 2.9,
  booking_platform_fee_percentage: 2.0,
  currency_code: "AUD",
  number_of_providers: 4,
  subscription_type: SubscriptionType.FREE,
  payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH],
  preferred_payment_method: PaymentMethod.CASH,
  deposit_type: DepositType.FIXED,
  deposit_percentage: null,
  deposit_fixed_amount: 100.0,
  website_url: "https://tigapropertyservices.com.au/",
  whatsapp_number: "+61412345678",
  whatsapp_phone_number_id: "684078768113901",
  stripe_connect_account_id: "acct_1Rna89P41K8lchaj",
  stripe_account_status: "active",
  minimum_charge: 200
};
