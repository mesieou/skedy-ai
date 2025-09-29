#!/usr/bin/env tsx

/**
 * Regenerate Availability Script
 *
 * Regenerates availability slots for all businesses in the database.
 * This script is needed when the generateInitialBusinessAvailability function
 * has been updated and existing availability data needs to be refreshed.
 *
 * Usage:
 *   Development: npx tsx scripts/regenerate-all-availability.ts
 *   Production: npx tsx scripts/regenerate-all-availability.ts --production
 *
 * Features:
 * - Fetches all businesses from the database
 * - Gets providers and calendar settings for each business
 * - Regenerates availability using the updated logic
 * - Supports both development and production databases
 * - Includes safety confirmations and progress tracking
 */

import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load environment variables based on environment
const isProduction = process.argv.includes('--production');
if (isProduction) {
  console.log('🚀 Running in PRODUCTION mode');
  dotenv.config({ path: path.join(__dirname, '../.env.production') });
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
} else {
  console.log('🧪 Running in DEVELOPMENT mode');
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
  dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });
}

import { BusinessRepository } from '../features/shared/lib/database/repositories/business-repository';
import { UserRepository } from '../features/shared/lib/database/repositories/user-repository';
import { CalendarSettingsRepository } from '../features/shared/lib/database/repositories/calendar-settings-repository';
import { AvailabilitySlotsRepository } from '../features/shared/lib/database/repositories/availability-slots-repository';
import { DateUtils } from '../features/shared/utils/date-utils';
import { initializeTestDatabase } from '../features/shared/lib/test-setup';
import { sentry } from '../features/shared/utils/sentryService';

// Import updated calendar settings data
import {
  weekdayCalendarSettingsData,
  weekendCalendarSettingsData
} from '../features/shared/lib/database/seeds/data/calendar-settings-data';

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function confirmAction(message: string): Promise<boolean> {
  const answer = await askQuestion(`${message} (y/N): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function regenerateAllAvailability() {
  console.log('\n🔄 Regenerate Availability for All Businesses');
  console.log('='.repeat(50));

  try {
    // Initialize database connection
    if (!isProduction) {
      await initializeTestDatabase();
    }

    // Initialize repositories
    const businessRepo = new BusinessRepository();
    const userRepo = new UserRepository();
    const calendarRepo = new CalendarSettingsRepository();
    const availabilityRepo = new AvailabilitySlotsRepository();

    // Step 1: Fetch all businesses
    console.log('\n📊 Fetching all businesses...');
    const businesses = await businessRepo.findAll();

    if (businesses.length === 0) {
      console.log('❌ No businesses found in the database');
      return;
    }

    console.log(`✅ Found ${businesses.length} businesses:`);
    businesses.forEach((business, index) => {
      console.log(`   ${index + 1}. ${business.name} (${business.email}) - ${business.time_zone}`);
    });

    // Step 2: Safety confirmation
    const environmentName = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
    console.log(`\n⚠️  WARNING: This will update calendar settings AND regenerate availability for ALL ${businesses.length} businesses in ${environmentName}`);
    console.log('   This action will:');
    console.log('   - Update calendar settings for all providers with latest data');
    console.log('   - Delete existing availability slots for each business');
    console.log('   - Generate new availability using updated logic and calendar settings');
    console.log('   - Create 30 days of availability from tomorrow');

    const confirmed = await confirmAction('\n🤔 Are you sure you want to continue?');
    if (!confirmed) {
      console.log('❌ Operation cancelled by user');
      return;
    }

    // Step 3: Process each business
    console.log('\n🔄 Starting availability regeneration...\n');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      const businessNumber = i + 1;

      console.log(`[${businessNumber}/${businesses.length}] Processing: ${business.name}`);

      try {
        // Get providers for this business
        console.log(`   📋 Fetching providers...`);
        const providers = await userRepo.findAll({}, { business_id: business.id });

        if (providers.length === 0) {
          console.log(`   ⚠️  No providers found for ${business.name}, skipping...`);
          continue;
        }

        console.log(`   ✅ Found ${providers.length} providers`);

        // Update calendar settings for all providers
        console.log(`   📅 Updating calendar settings...`);
        const updatedCalendarSettings = [];

        for (let i = 0; i < providers.length; i++) {
          const provider = providers[i];

          // Get existing calendar settings for this provider
          const existingSettings = await calendarRepo.findAll({}, { user_id: provider.id });

          // Determine which calendar settings template to use
          // First provider gets weekday settings, second gets weekend settings
          const templateData = i === 0 ? weekdayCalendarSettingsData : weekendCalendarSettingsData;

          if (existingSettings.length > 0) {
            // Update existing calendar settings
            for (const existingSetting of existingSettings) {
              const updatedSetting = await calendarRepo.updateOne(
                { id: existingSetting.id },
                {
                  settings: templateData.settings,
                  working_hours: templateData.working_hours
                }
              );
              updatedCalendarSettings.push(updatedSetting);
              console.log(`   ✅ Updated calendar settings for provider ${i + 1} (${provider.email})`);
            }
          } else {
            // Create new calendar settings if none exist
            const newSetting = await calendarRepo.create({
              ...templateData,
              user_id: provider.id
            });
            updatedCalendarSettings.push(newSetting);
            console.log(`   ✅ Created calendar settings for provider ${i + 1} (${provider.email})`);
          }
        }

        if (updatedCalendarSettings.length === 0) {
          console.log(`   ⚠️  No calendar settings could be created/updated for ${business.name}, skipping...`);
          continue;
        }

        console.log(`   ✅ Updated ${updatedCalendarSettings.length} calendar settings`);

        // Delete existing availability slots
        console.log(`   🗑️  Deleting existing availability...`);
        const existingAvailability = await availabilityRepo.findAll({}, { business_id: business.id });
        for (const availability of existingAvailability) {
          await availabilityRepo.deleteOne({ id: availability.id });
        }
        console.log(`   ✅ Deleted ${existingAvailability.length} existing availability records`);

        // Generate new availability
        console.log(`   🔄 Generating new availability...`);

        // Get tomorrow in business timezone
        const { date: todayInBusiness } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), business.time_zone);
        const tomorrowInBusiness = DateUtils.addDaysUTC(DateUtils.createSlotTimestamp(todayInBusiness, '00:00:00'), 1);
        const tomorrowBusinessDate = DateUtils.extractDateString(tomorrowInBusiness);

        await availabilityRepo.generateInitialBusinessAvailability(
          business.id,
          tomorrowBusinessDate,
          providers,
          updatedCalendarSettings,
          business.time_zone,
          30 // Generate 30 days of availability
        );

        console.log(`   ✅ Generated 30 days of availability from ${tomorrowBusinessDate}`);
        console.log(`   🎉 Successfully processed ${business.name}\n`);

        successCount++;

      } catch (error) {
        console.error(`   ❌ Error processing ${business.name}:`, error);
        errorCount++;

        // Track error in Sentry if available
        sentry.trackError(error as Error, {
          sessionId: 'regenerate-availability-script',
          operation: 'regenerate_business_availability',
          metadata: {
            businessId: business.id,
            businessName: business.name,
            environment: environmentName
          }
        });
      }
    }

    // Step 4: Summary
    console.log('\n📊 REGENERATION SUMMARY');
    console.log('='.repeat(30));
    console.log(`✅ Successfully processed: ${successCount} businesses`);
    console.log(`❌ Failed to process: ${errorCount} businesses`);
    console.log(`📊 Total businesses: ${businesses.length}`);

    if (successCount === businesses.length) {
      console.log('\n🎉 All businesses processed successfully!');
    } else if (successCount > 0) {
      console.log('\n⚠️  Some businesses processed with errors. Check logs above.');
    } else {
      console.log('\n❌ No businesses were processed successfully.');
    }

  } catch (error) {
    console.error('\n💥 Fatal error during availability regeneration:', error);

    // Track fatal error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'regenerate-availability-script',
      operation: 'regenerate_all_availability_fatal',
      metadata: {
        environment: isProduction ? 'production' : 'development'
      }
    });

    process.exit(1);
  } finally {
    rl.close();
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Availability Regeneration Script');
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  await regenerateAllAvailability();

  console.log('\n✨ Script completed');
  process.exit(0);
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Script terminated');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  rl.close();
  process.exit(1);
});
