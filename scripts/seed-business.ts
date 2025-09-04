#!/usr/bin/env tsx

/**
 * Business Seeding Script
 *
 * Creates a complete business setup for development/testing
 * Usage: npm run seed-business
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

// Admin client will be detected automatically for scripts

import { fullBusinessSetupSeeder } from '../features/shared/lib/database/seeds/full-business-setup';
import { initializeTestDatabase } from '../features/shared/lib/test-setup';

async function main() {
  try {
    console.log('🌱 Starting removalist business seeding...\n');

    // Initialize database client (same as tests do)
    console.log('🔧 Initializing database client...');
    await initializeTestDatabase();

    // Clean up any existing removalist businesses first
    console.log('🧹 Cleaning up existing removalist businesses...');
    await fullBusinessSetupSeeder.cleanupRemovalistBusinesses();

    // Create one removalist business setup
    console.log('📊 Creating removalist business setup...');
    const setup = await fullBusinessSetupSeeder.createFullBusinessSetup();

    console.log('\n📋 Business Setup Complete!');
    console.log('=====================================');
    console.log(`🏢 Business: ${setup.business.name}`);
    console.log(`📞 Phone: ${setup.business.phone_number}`);
    console.log(`📧 Email: ${setup.business.email}`);
    console.log(`📍 Address: ${setup.business.address}`);
    console.log(`💰 Currency: ${setup.business.currency_code}`);
    console.log(`🏷️ Category: ${setup.business.business_category}`);
    console.log('');
    console.log(`👨‍💼 Admin/Provider: ${setup.adminProvider.email}`);
    console.log(`👷 Provider: ${setup.provider.email}`);
    console.log(`👤 Customer: ${setup.customer.email}`);
    console.log('');
    console.log(`🛠️ Services: ${setup.services.length}`);
    console.log(`📅 Calendar Settings: ${setup.calendarSettings.length}`);
    console.log(`🕐 Availability Days: ${Object.keys(setup.availabilitySlots.slots).length}`);
    console.log('=====================================\n');

    console.log('🎉 Removalist business setup completed successfully!');
    console.log('💡 You can now:');
    console.log(`   - Test voice calls to: ${setup.business.phone_number}`);
    console.log('   - Use the business context in your AI assistant');
    console.log('   - Test booking flows with the created users');
    console.log('   - Check availability slots for scheduling');
    console.log('   - AI will use the generated service requirements for quotes');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
main().catch(console.error);
