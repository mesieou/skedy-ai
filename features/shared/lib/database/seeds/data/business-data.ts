import type { CreateBusinessData } from '../../types/business';
import { BusinessCategory, SubscriptionType, PaymentMethod, DepositType } from '../../types/business';

// Helper function to generate unique test data for parallel test execution
function generateUniqueIdentifier(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Function to create unique business data for tests
export function createUniqueRemovalistBusinessData(): CreateBusinessData {
  const uniqueId = generateUniqueIdentifier();
  return {
    name: `Tiga Removals ${uniqueId}`,
    email: `edward+${uniqueId}@tigapropertyservices.com`,
    phone_number: `+61468002102`,
    address: "123 Collins Street, Melbourne VIC 3000, Australia",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.TRANSPORT,
    charges_gst: true,
    prices_include_gst: true,
    gst_rate: 10.00,
    charges_deposit: true,
    payment_processing_fee_percentage: 2.9,
    booking_platform_fee_percentage: 2.0,
    currency_code: "AUD",
    number_of_providers: 2,
    subscription_type: SubscriptionType.FREE,
    payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH],
    preferred_payment_method: PaymentMethod.CASH,
    deposit_type: DepositType.FIXED,
    deposit_percentage: null,
    deposit_fixed_amount: 100.0,
    website_url: "https://tigapropertyservices.com.au/",
    whatsapp_number: `+61412345${Math.floor(Math.random() * 900) + 100}`,
    whatsapp_phone_number_id: "684078768113901",
    stripe_connect_account_id: "acct_1Rna89P41K8lchaj",
    stripe_account_status: "active",
    offers_mobile_services: true,   // "Yes, we travel to customers for pickup/dropoff"
    offers_location_services: false, // "No, customers don't come to our warehouse"
    minimum_charge: 200,
    twilio_account_sid: "AC017f39060e7fafce96588f27c558c93f"
  };
}

// Function to create unique manicurist business data for tests
export function createUniqueMobileManicuristBusinessData(): CreateBusinessData {
  const uniqueId = generateUniqueIdentifier();
  return {
    name: `Nails on the Go ${uniqueId}`,
    email: `bookings+${uniqueId}@nailsonthego.com.au`,
    phone_number: `+61498765${Math.floor(Math.random() * 900) + 100}`,
    address: "321 High Street, Prahran VIC 3181, Australia",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.BEAUTY,
    charges_gst: false,
    prices_include_gst: false,
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
    whatsapp_number: `+61498765${Math.floor(Math.random() * 900) + 100}`,
    whatsapp_phone_number_id: "684078768113904",
    stripe_connect_account_id: "acct_1Rna89P41K8lcham",
    stripe_account_status: "active",
    offers_mobile_services: true,   // "Yes, we travel to customer homes"
    offers_location_services: true,  // "Yes, customers can also come to our salon"
    minimum_charge: 60.0,
    twilio_account_sid: "AC017f39060e7fafce96588f27c558c93f"
  };
}

// Function to create unique massage business data for tests
export function createUniqueMassageBusinessData(): CreateBusinessData {
  const uniqueId = generateUniqueIdentifier();
  return {
    name: `Serenity Spa & Massage ${uniqueId}`,
    email: `info+${uniqueId}@serenityspa.com.au`,
    phone_number: `+61387654${Math.floor(Math.random() * 900) + 100}`,
    address: "456 Chapel Street, South Yarra VIC 3141, Australia",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.BEAUTY,
    charges_gst: true,
    prices_include_gst: true,
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
    whatsapp_number: `+61387654${Math.floor(Math.random() * 900) + 100}`,
    whatsapp_phone_number_id: "684078768113905",
    stripe_connect_account_id: "acct_1Rna89P41K8lchan",
    stripe_account_status: "active",
    offers_mobile_services: false,  // "No, customers come to our spa"
    offers_location_services: true,  // "Yes, customers visit our location"
    minimum_charge: 80.0
  };
}

// Function to create Skedy business data for tests
export function createSkedyBusinessData(): CreateBusinessData {
  return {
    name: "Skedy",
    email: "info@skedy.io",
    phone_number: "+61411851098",
    address: "1 Aberdeen Road, Blackburn South, VIC, Australia",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.OTHER, // Technology falls under OTHER category
    charges_gst: false,
    prices_include_gst: false,
    gst_rate: 0.0,
    charges_deposit: false,
    payment_processing_fee_percentage: 2.9, // Stripe default
    booking_platform_fee_percentage: 2.0,   // Assuming same as removals example
    currency_code: "AUD",
    number_of_providers: 1,
    subscription_type: SubscriptionType.FREE,
    payment_methods: [PaymentMethod.STRIPE],
    preferred_payment_method: PaymentMethod.STRIPE,
    deposit_type: DepositType.FIXED, // Using FIXED with 0 amount for no deposit
    deposit_percentage: null,
    deposit_fixed_amount: 0.0,
    website_url: "https://skedy.io/",
    whatsapp_number: "+61411851098", // Using your number
    whatsapp_phone_number_id: null, // Fill when you link WA Business API
    stripe_connect_account_id: null, // Fill after Stripe onboarding
    stripe_account_status: "inactive", // Default until connected
    offers_mobile_services: true,
    offers_location_services: false,
    minimum_charge: 0,
    twilio_account_sid: "AC017f39060e7fafce96588f27c558c93f"
  };
}
