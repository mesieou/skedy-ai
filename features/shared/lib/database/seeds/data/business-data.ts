import type { CreateBusinessData } from '../../types/business';
import { BusinessCategory, SubscriptionType, PaymentMethod, DepositType } from '../../types/business';

// Helper function to generate unique test data for parallel test execution
function generateUniqueIdentifier(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Function to create unique business data for tests
export function createTigaRemovalistBusinessData(): CreateBusinessData {
  const uniqueId = generateUniqueIdentifier();
  return {
    name: `Tiga Removals ${uniqueId}`,
    email: `edward@tigapropertyservices.com.au`,
    phone_number: `+61424028285`,
    address: "4/5 dickens street, heidelberg Heights VIC 3081",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.REMOVALIST,
    charges_gst: true,
    prices_include_gst: false,
    gst_rate: 10.00,
    charges_deposit: true,
    payment_processing_fee_percentage: 2.9,
    booking_platform_fee_percentage: 0.0,
    currency_code: "AUD",
    number_of_providers: 5,
    subscription_type: SubscriptionType.FREE,
    payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH],
    preferred_payment_method: PaymentMethod.CASH,
    deposit_type: DepositType.FIXED,
    deposit_percentage: null,
    deposit_fixed_amount: 100.0,
    website_url: "https://tigapropertyservices.com.au/",
    whatsapp_number: `+61424028285`,
    whatsapp_phone_number_id: "684078768113901",
    stripe_connect_account_id: "acct_1SEJXA1xtwm3bvA1",
    stripe_account_status: "active",
    offers_mobile_services: true,   // "Yes, we travel to customers for pickup/dropoff"
    offers_location_services: false, // "No, customers don't come to our warehouse"
    minimum_charge: 150,
    twilio_number: `+61468031068`,
    openai_api_key_name: "TIGA"
  };
}

export function createUniqueRemovalistBusinessData(): CreateBusinessData {
  const uniqueId = generateUniqueIdentifier();
  return {
    name: `David Removals ${uniqueId}`,
    email: `David+${uniqueId}@davidremovals.com`,
    phone_number: `+61468002102`,
    address: "123 Collins Street, Melbourne VIC 3000, Australia",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.REMOVALIST,
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
    website_url: "https://davidremovals.com.au/",
    whatsapp_number: `+61412345${Math.floor(Math.random() * 900) + 100}`,
    whatsapp_phone_number_id: "684078768113901",
    stripe_connect_account_id: "acct_1SEJXA1xtwm3bvA1",
    stripe_account_status: "active",
    offers_mobile_services: true,   // "Yes, we travel to customers for pickup/dropoff"
    offers_location_services: false, // "No, customers don't come to our warehouse"
    minimum_charge: 200,
    twilio_number: process.env.TWILIO_NUMBER_DEMO,
    openai_api_key_name: "DEMO"
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
    business_category: BusinessCategory.MANICURIST,
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
    stripe_connect_account_id: "acct_1SEJXA1xtwm3bvA1",
    stripe_account_status: "active",
    offers_mobile_services: true,   // "Yes, we travel to customer homes"
    offers_location_services: true,  // "Yes, customers can also come to our salon"
    minimum_charge: 60.0,
    twilio_number: process.env.TWILIO_NUMBER_DEMO,
    openai_api_key_name: "DEMO"
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
    business_category: BusinessCategory.MANICURIST,
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
    stripe_connect_account_id: "acct_1SEJXA1xtwm3bvA1",
    stripe_account_status: "active",
    offers_mobile_services: false,  // "No, customers come to our spa"
    offers_location_services: true,  // "Yes, customers visit our location"
    minimum_charge: 80.0,
    twilio_number: process.env.TWILIO_NUMBER_DEMO,
    openai_api_key_name: "DEMO"
  };
}

// Function to create unique plumber business data for tests
export function createUniquePlumberBusinessData(): CreateBusinessData {
  const uniqueId = generateUniqueIdentifier();
  return {
    name: `Fix-It Plumbing ${uniqueId}`,
    email: `mike+${uniqueId}@fixitplumbing.com.au`,
    phone_number: `+61387654${Math.floor(Math.random() * 900) + 100}`,
    address: "789 Smith Street, Collingwood VIC 3066, Australia",
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.PLUMBER,
    charges_gst: true,
    prices_include_gst: true,
    gst_rate: 10.00,
    charges_deposit: true,
    payment_processing_fee_percentage: 2.9,
    booking_platform_fee_percentage: 3.5,
    currency_code: "AUD",
    number_of_providers: 2,
    subscription_type: SubscriptionType.BASIC,
    payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.CASH],
    preferred_payment_method: PaymentMethod.CREDIT_CARD,
    deposit_type: DepositType.FIXED,
    deposit_percentage: null,
    deposit_fixed_amount: 50.0,
    website_url: "https://fixitplumbing.com.au",
    whatsapp_number: `+61387654${Math.floor(Math.random() * 900) + 100}`,
    whatsapp_phone_number_id: "684078768113906",
    stripe_connect_account_id: "acct_1SEJXA1xtwm3bvA1",
    stripe_account_status: "active",
    offers_mobile_services: true,
    offers_location_services: false,
    minimum_charge: 120.0,
    twilio_number: process.env.TWILIO_NUMBER_DEMO,
    openai_api_key_name: "DEMO"
  };
}

// Function to create Man With A Van business data
export function createMWAVBusinessData(): CreateBusinessData {
  return {
    name: "Man With A Van",
    email: "info@manwithavan.com.au",
    phone_number: "+61394173443",  // (03) 9417 3443
    address: "13-29 Nelson St, Abbotsford VIC 3067",  // Primary location
    time_zone: "Australia/Melbourne",
    language: "en",
    business_category: BusinessCategory.REMOVALIST,
    charges_gst: true,
    prices_include_gst: true,  // Australian businesses typically include GST in displayed prices
    gst_rate: 10.00,
    charges_deposit: false,  // MWAV handles payments, not Skedy
    payment_processing_fee_percentage: 0,
    booking_platform_fee_percentage: 0,  // Partnership model - no Skedy fees
    currency_code: "AUD",
    number_of_providers: 30,
    subscription_type: SubscriptionType.FREE,  // Partnership arrangement
    payment_methods: [PaymentMethod.CREDIT_CARD],  // EFTPOS, Visa, MasterCard = CREDIT_CARD
    preferred_payment_method: PaymentMethod.CREDIT_CARD,
    deposit_type: DepositType.FIXED,
    deposit_percentage: null,
    deposit_fixed_amount: 0.0,  // No deposit through Skedy
    website_url: "https://www.manwithavan.com.au/",
    whatsapp_number: null,  // Not provided
    whatsapp_phone_number_id: null,
    stripe_connect_account_id: null,  // MWAV handles their own payments
    stripe_account_status: "inactive",  // Not using Skedy payment processing
    offers_mobile_services: true,   // Yes, they travel to customers for pickup/dropoff
    offers_location_services: false, // Customers don't come to warehouse
    minimum_charge: 0,  // No minimum through Skedy (MWAV handles pricing)
    twilio_number: "+61879436787",
    openai_api_key_name: "MWAV"
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
    business_category: BusinessCategory.TECHNOLOGY, // Skedy is a technology platform
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
    twilio_number: process.env.TWILIO_NUMBER_DEMO,
    openai_api_key_name: "DEMO"
  };
}
