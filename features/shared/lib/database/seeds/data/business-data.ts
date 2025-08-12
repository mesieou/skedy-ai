import type { CreateBusinessData } from '../../types/business';

// Test business data for seeding
export const removalistBusinessData: CreateBusinessData = {
  name: "Tiga Removals",
  email: "edward@tigapropertyservices.com",
  phone_number: "+61473164581",
  address: "123 Collins Street, Melbourne VIC 3000, Australia",
  time_zone: "Australia/Melbourne",
  language: "en",
  business_category: "transport",
  charges_gst: true,
  gst_rate: 10.00,
  currency_code: "AUD",
  number_of_providers: 4,
  subscription_type: "free",
  payment_methods: ["credit_card", "bank_transfer", "cash"],
  preferred_payment_method: "cash",
  deposit_type: "fixed",
  deposit_percentage: null,
  deposit_fixed_amount: 100.0,
  website_url: "https://tigapropertyservices.com.au/",
  whatsapp_number: "+61412345678",
  whatsapp_phone_number_id: "684078768113901",
  stripe_connect_account_id: "acct_1Rna89P41K8lchaj",
  stripe_account_status: "active"
};
