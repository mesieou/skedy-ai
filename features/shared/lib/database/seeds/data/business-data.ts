import type { CreateBusinessData } from '../../types/business';
import { BusinessCategory, SubscriptionType, PaymentMethod, DepositType } from '../../types/business';

// Example 1-4: Removalist Business (Transport Category)
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
  offers_mobile_services: true,   // "Yes, we travel to customers for pickup/dropoff"
  offers_location_services: false, // "No, customers don't come to our warehouse"
  minimum_charge: 200
};

// Examples 5-8: Mobile Manicurist Business (Beauty Category)
export const mobileManicuristBusinessData: CreateBusinessData = {
  name: "Nails on the Go",
  email: "bookings@nailsonthego.com.au",
  phone_number: "+61498765432",
  address: "321 High Street, Prahran VIC 3181, Australia",
  time_zone: "Australia/Melbourne",
  language: "en",
  business_category: BusinessCategory.BEAUTY,
  charges_gst: false,
  gst_rate: 0.00,
  charges_deposit: true,
  payment_processing_fee_percentage: 2.8,
  booking_platform_fee_percentage: 4.0,
  currency_code: "AUD",
  number_of_providers: 2,
  subscription_type: SubscriptionType.BASIC,
  payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.PAYPAL],
  preferred_payment_method: PaymentMethod.CREDIT_CARD,
  deposit_type: DepositType.PERCENTAGE,
  deposit_percentage: 50.0,
  deposit_fixed_amount: null,
  website_url: "https://nailsonthego.com.au",
  whatsapp_number: "+61498765433",
  whatsapp_phone_number_id: "684078768113904",
  stripe_connect_account_id: "acct_1Rna89P41K8lcham",
  stripe_account_status: "active",
  offers_mobile_services: true,   // "Yes, we travel to customer homes"
  offers_location_services: true,  // "Yes, customers can also come to our salon"
  minimum_charge: 60.0
};

// Example 9: Massage Business (Beauty Category - Location-based only)
export const massageBusinessData: CreateBusinessData = {
  name: "Serenity Spa & Massage",
  email: "info@serenityspa.com.au",
  phone_number: "+61387654321",
  address: "456 Chapel Street, South Yarra VIC 3141, Australia",
  time_zone: "Australia/Melbourne",
  language: "en",
  business_category: BusinessCategory.BEAUTY,
  charges_gst: true,
  gst_rate: 10.00,
  charges_deposit: false,
  payment_processing_fee_percentage: 2.5,
  booking_platform_fee_percentage: 3.0,
  currency_code: "AUD",
  number_of_providers: 3,
  subscription_type: SubscriptionType.PREMIUM,
  payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.CASH],
  preferred_payment_method: PaymentMethod.CREDIT_CARD,
  deposit_type: DepositType.PERCENTAGE,
  deposit_percentage: 25.0,
  deposit_fixed_amount: null,
  website_url: "https://serenityspa.com.au",
  whatsapp_number: "+61387654322",
  whatsapp_phone_number_id: "684078768113905",
  stripe_connect_account_id: "acct_1Rna89P41K8lchan",
  stripe_account_status: "active",
  offers_mobile_services: false,  // "No, customers come to our spa"
  offers_location_services: true,  // "Yes, customers visit our location"
  minimum_charge: 80.0
};

