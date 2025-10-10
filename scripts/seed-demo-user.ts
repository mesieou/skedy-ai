#!/usr/bin/env tsx

/**
 * Demo User Seeder
 * 
 * Creates a demo user with both bookings and chat sessions/transcriptions
 * for testing the dashboard functionality.
 * 
 * Usage: npx tsx scripts/seed-demo-user.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { AuthUserSeeder } from '../features/shared/lib/database/seeds/auth-user-seeder';
import { UserSeeder } from '../features/shared/lib/database/seeds/user-seeder';
import { BusinessSeeder } from '../features/shared/lib/database/seeds/business-seeder';
import { ServiceSeeder } from '../features/shared/lib/database/seeds/service-seeder';
import { BookingSeeder } from '../features/shared/lib/database/seeds/booking-seeder';
import { ChatSessionSeeder } from '../features/shared/lib/database/seeds/chat-session-seeder';
import { InteractionsRepository } from '../features/shared/lib/database/repositories/interactions-repository';
import { InteractionType } from '../features/shared/lib/database/types/interactions';
import { UserRole } from '../features/shared/lib/database/types/user';
import { DateUtils } from '../features/shared/utils/date-utils';
import { ChatChannel, ChatSessionStatus, MessageSenderType } from '../features/shared/lib/database/types/chat-sessions';
import { BookingStatus } from '../features/shared/lib/database/types/bookings';
import type { QuoteRequestInfo } from '../features/scheduling/lib/types/booking-calculations';
import { AddressRole } from '../features/scheduling/lib/types/booking-calculations';
import { createUniqueCustomerAuthUserData } from '../features/shared/lib/database/seeds/data/auth-user-data';
import { BookingCalculator } from '../features/scheduling/lib/bookings/quoteCalculation';

// Import business and service data
import {
  createUniqueRemovalistBusinessData,
  createUniqueMobileManicuristBusinessData,
} from '../features/shared/lib/database/seeds/data/business-data';

import {
  removalistTigaService1Data,
  manicuristExample5Service1Data,
} from '../features/shared/lib/database/seeds/data/services-data';

async function seedDemoUser() {
  console.log('🌱 Starting demo user seeding...\n');

  try {
    // Initialize seeders
    const authUserSeeder = new AuthUserSeeder();
    const userSeeder = new UserSeeder();
    const businessSeeder = new BusinessSeeder();
    const serviceSeeder = new ServiceSeeder();
    const bookingSeeder = new BookingSeeder();
    const chatSessionSeeder = new ChatSessionSeeder();
    const interactionsRepo = new InteractionsRepository();

    // 1. Create demo customer auth user
    console.log('👤 Creating demo customer auth user...');
    const demoAuthUser = await authUserSeeder.createAuthUserWith(
        createUniqueCustomerAuthUserData()
    );
    console.log(`✅ Created auth user: ${demoAuthUser.email} (ID: ${demoAuthUser.id})\n`);

    // 2. Create businesses for testing FIRST (needed for user profile)
    console.log('🏢 Creating demo businesses...');
    const removalistBusiness = await businessSeeder.createWith(
        createUniqueRemovalistBusinessData()
    );
    const manicuristBusiness = await businessSeeder.createWith(
        createUniqueMobileManicuristBusinessData()
    );
    console.log(`✅ Created removalist business: ${removalistBusiness.name}`);
    console.log(`✅ Created manicurist business: ${manicuristBusiness.name}\n`);

    // 3. Create user profile (assign to first business)
    console.log('📝 Creating user profile...');
    const demoUser = await userSeeder.createWith({
        email: demoAuthUser.email,
        first_name: 'Demo',
        last_name: 'Customer',
        phone_number: `+614${Math.floor(Math.random() * 100000000)}`, // Generate unique phone
        role: UserRole.CUSTOMER,
        business_id: removalistBusiness.id,
    }, { id: demoAuthUser.id });
    console.log(`✅ Created user profile: ${demoUser.first_name} ${demoUser.last_name}\n`);

    // 4. Create services
    console.log('🛠️  Creating services...');
    const removalistService = await serviceSeeder.createWith({
      ...removalistTigaService1Data,
      business_id: removalistBusiness.id,
    });
    const manicuristService = await serviceSeeder.createWith({
      ...manicuristExample5Service1Data,
      business_id: manicuristBusiness.id,
    });
    console.log(`✅ Created removalist service: ${removalistService.name}`);
    console.log(`✅ Created manicurist service: ${manicuristService.name}\n`);

    // 5. Create bookings
    console.log('📅 Creating demo bookings...\n');

    // Initialize booking calculator
    const bookingCalculator = new BookingCalculator();

    // Booking 1: Confirmed removalist booking (upcoming)
    const booking1StartDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), 3); // 3 days from now
    
    // Calculate quote for booking 1
    const { quoteResult: quote1Result, quoteRequest: quote1Request } = await bookingCalculator.calculateBooking(
        {
            service_name: removalistService.name,
            quantity: 2,
            pickup_addresses: [
                '123 Melbourne St, Melbourne VIC 3000, Australia'
            ],
            dropoff_addresses: [
                '456 Richmond Rd, Richmond VIC 3121, Australia'
            ],
        },
        removalistService,
        removalistBusiness
    );
    const booking1 = await bookingSeeder.createBookingWithServicesAndAddresses(
        quote1Request,
        demoUser.id,
        booking1StartDate
    );
    console.log(`✅ Created upcoming removalist booking (${booking1.status})`);
    console.log(`   Start: ${booking1.start_at}`);
    console.log(`   Total: $${booking1.total_estimate_amount}\n`);

    // Booking 2: Completed manicurist booking (past)
    const booking2StartDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), -7); // 7 days ago

    // Calculate quote for booking 2
    const { quoteResult: quote2Result, quoteRequest: quote2Request } = await bookingCalculator.calculateBooking(
        {
            service_name: manicuristService.name,
            quantity: 1,
            customer_addresses: [
                '789 North Melbourne Ave, North Melbourne VIC 3051, Australia'
            ],
        },
        manicuristService,
        manicuristBusiness
    );

    const booking2 = await bookingSeeder.createBookingWithServicesAndAddresses(
        quote2Request,
        demoUser.id,
        booking2StartDate
    );
    console.log(`✅ Created past manicurist booking (${booking2.status})`);
    console.log(`   Start: ${booking2.start_at}`);
    console.log(`   Total: $${booking2.total_estimate_amount}\n`);

    // 6. Create chat sessions with messages
    // Session 1: Phone call with removalist (ended)
    const session1StartDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), -5);
    const session1EndDate = DateUtils.addMinutesUTC(session1StartDate, 8);
    
    const session1 = await chatSessionSeeder.createWith({
      channel: ChatChannel.PHONE,
      user_id: demoUser.id,
      business_id: removalistBusiness.id,
      status: ChatSessionStatus.ENDED,
      ended_at: session1EndDate,
      token_spent: {
        inputTokens: 1250,
        outputTokens: 890,
        cachedTokens: 500,
        uncachedTokens: 750,
        audioInputTokens: 3200,
        audioOutputTokens: 2800,
        totalCost: 0.0456,
        lastUpdated: Date.now(),
      },
    });

    // Create interactions for session 1
    console.log('💬 Creating demo chat sessions...\n');
    
    // Interaction 1: Initial greeting (thumbs up)
    await interactionsRepo.create({
      session_id: session1.id,
      business_id: removalistBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.INITIAL,
      customer_input: null,
      prompt: 'You are a helpful AI assistant for a removalist business. Greet the customer warmly.',
      prompt_name: 'removalist_greeting',
      prompt_version: 'v1.0',
      model_output: 'Hello! Thanks for contacting us. How can I help you with your move today?',
      generated_from_tool_calling: false,
      human_outcome: true, // thumbs up
      human_critique: '👍 Great greeting!',
    });

    // Interaction 2: Understanding customer needs (thumbs up)
    await interactionsRepo.create({
      session_id: session1.id,
      business_id: removalistBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.NORMAL,
      customer_input: 'I need help moving furniture from Melbourne to Richmond',
      prompt: 'You are a helpful AI assistant. The customer needs moving services. Ask clarifying questions.',
      prompt_name: 'removalist_inquiry',
      prompt_version: 'v1.0',
      model_output: 'I\'d be happy to help! Can you tell me more about what you need to move? Is it a full house or specific items?',
      generated_from_tool_calling: false,
      human_outcome: true, // thumbs up
    });

    // Interaction 3: Getting details (thumbs down with feedback)
    await interactionsRepo.create({
      session_id: session1.id,
      business_id: removalistBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.NORMAL,
      customer_input: 'I have a 2-bedroom apartment worth of furniture',
      prompt: 'Customer has 2-bedroom apartment furniture. Provide quote and ask about timing.',
      prompt_name: 'removalist_quote',
      prompt_version: 'v1.0',
      model_output: 'For a 2-bedroom apartment, we typically charge $150 per hour with a 2-person team. When would you like to schedule?',
      generated_from_tool_calling: false,
      human_outcome: false, // thumbs down
      human_critique: '👎 Should have asked about distance first before giving a quote. The price might vary based on travel time.',
    });

    // Interaction 4: Scheduling (thumbs up)
    await interactionsRepo.create({
      session_id: session1.id,
      business_id: removalistBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.NORMAL,
      customer_input: 'How about this Saturday?',
      prompt: 'Customer wants Saturday. Confirm availability and finalize booking.',
      prompt_name: 'removalist_booking',
      prompt_version: 'v1.0',
      model_output: 'Saturday works great! I\'ll book you in for 9 AM. You\'ll receive a confirmation email shortly.',
      generated_from_tool_calling: true,
      tool_name: 'create_booking',
      tool_schema_version: 'v1.0',
      human_outcome: true, // thumbs up
    });

    console.log(`✅ Created phone session with removalist`);
    console.log(`   Duration: 8 minutes`);
    console.log(`   Interactions: 4 (3 👍, 1 👎)`);
    console.log(`   Cost: $${session1.token_spent?.totalCost}\n`);

    // Session 2: WhatsApp chat with manicurist (ended)
    const session2StartDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), -8);
    const session2EndDate = DateUtils.addMinutesUTC(session2StartDate, 5);

    const session2 = await chatSessionSeeder.createWith({
      channel: ChatChannel.WHATSAPP,
      user_id: demoUser.id,
      business_id: manicuristBusiness.id,
      status: ChatSessionStatus.ENDED,
      ended_at: session2EndDate,
      token_spent: {
        inputTokens: 850,
        outputTokens: 620,
        cachedTokens: 300,
        uncachedTokens: 550,
        audioInputTokens: 0,
        audioOutputTokens: 0,
        totalCost: 0.0234,
        lastUpdated: Date.now(),
      },
    });

    // Create interactions for session 2
    await interactionsRepo.create({
      session_id: session2.id,
      business_id: manicuristBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.INITIAL,
      customer_input: null,
      prompt: 'You are a helpful AI assistant for a mobile manicure business.',
      prompt_name: 'manicurist_greeting',
      prompt_version: 'v1.0',
      model_output: 'Hi there! Welcome to Nails on the Go. How can I help you today?',
      generated_from_tool_calling: false,
      human_outcome: true,
    });

    await interactionsRepo.create({
      session_id: session2.id,
      business_id: manicuristBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.NORMAL,
      customer_input: 'Do you do mobile manicures?',
      prompt: 'Customer asking about mobile services.',
      prompt_name: 'manicurist_services',
      prompt_version: 'v1.0',
      model_output: 'Yes! We specialize in mobile manicure services. We come to your location. What type of service are you interested in?',
      generated_from_tool_calling: false,
      human_outcome: true,
      human_critique: '👍 Clear and helpful response',
    });

    await interactionsRepo.create({
      session_id: session2.id,
      business_id: manicuristBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.NORMAL,
      customer_input: 'Just a basic manicure at my home in North Melbourne',
      prompt: 'Customer wants basic manicure at home.',
      prompt_name: 'manicurist_booking',
      prompt_version: 'v1.0',
      model_output: 'Perfect! Our basic manicure is $45. When would you like to book?',
      generated_from_tool_calling: false,
      human_outcome: true,
    });

    console.log(`✅ Created WhatsApp session with manicurist`);
    console.log(`   Duration: 5 minutes`);
    console.log(`   Interactions: 3 (all 👍)`);
    console.log(`   Cost: $${session2.token_spent?.totalCost}\n`);

    // Session 3: Active website chat
    const session3StartDate = DateUtils.addMinutesUTC(DateUtils.nowUTC(), -15);

    const session3 = await chatSessionSeeder.createWith({
      channel: ChatChannel.WEBSITE,
      user_id: demoUser.id,
      business_id: removalistBusiness.id,
      status: ChatSessionStatus.ACTIVE,
      ended_at: null,
      token_spent: {
        inputTokens: 320,
        outputTokens: 180,
        cachedTokens: 150,
        uncachedTokens: 170,
        audioInputTokens: 0,
        audioOutputTokens: 0,
        totalCost: 0.0089,
        lastUpdated: Date.now(),
      },
    });

    // Create interactions for session 3 (active conversation)
    await interactionsRepo.create({
      session_id: session3.id,
      business_id: removalistBusiness.id,
      user_id: demoUser.id,
      type: InteractionType.NORMAL,
      customer_input: 'What are your rates for interstate moves?',
      prompt: 'Customer asking about interstate moving rates.',
      prompt_name: 'removalist_interstate',
      prompt_version: 'v1.0',
      model_output: 'Our interstate moving rates vary based on distance and volume. Can you tell me where you\'re moving from and to?',
      generated_from_tool_calling: false,
      human_outcome: false,
      human_critique: '👎 Should provide a general price range first to set expectations before asking for details.',
    });

    console.log(`✅ Created active website chat with removalist`);
    console.log(`   Status: Active`);
    console.log(`   Interactions: 1 (1 👎)`);
    console.log(`   Cost: $${session3.token_spent?.totalCost}\n`);

    // Summary
    console.log('✨ Demo user seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Auth User: ${demoAuthUser.email}`);
    console.log(`   Password: DemoPassword123!`);
    console.log(`   User ID: ${demoUser.id}`);
    console.log(`   Bookings: 2 (1 upcoming, 1 past)`);
    console.log(`   Chat Sessions: 3 (2 ended, 1 active)`);
    console.log(`   Interactions: 8 (6 👍, 2 👎)\n`);
    console.log('🔗 Login at: http://localhost:3000/auth/login');
    console.log('📱 Dashboard: http://localhost:3000/dashboard\n');

  } catch (error) {
    console.error('❌ Error seeding demo user:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDemoUser();