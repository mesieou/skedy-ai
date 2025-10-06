#!/usr/bin/env tsx

/**
 * Setup Removalist Business Script
 *
 * Creates a complete removalist business setup for development/testing
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.production') });
// dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { BusinessSeeder } from '../features/shared/lib/database/seeds/business-seeder';
import { UserSeeder } from '../features/shared/lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../features/shared/lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../features/shared/lib/database/seeds/service-seeder';
import { CalendarSettingsSeeder } from '../features/shared/lib/database/seeds/calendar-settings-seeder';
import { AvailabilitySlotsRepository } from '../features/shared/lib/database/repositories/availability-slots-repository';
import { BusinessToolsRepository } from '../features/shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '../features/shared/lib/database/repositories/business-prompt-repository';
import { ToolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { PromptsSeeder } from '../features/shared/lib/database/seeds/prompts-seeder';
import {
  removalistTigaService1Data,
  removalistTigaService2Data,
  removalistTigaService3Data,
  removalistTigaService4Data,
  removalistTigaService5Data
} from '../features/shared/lib/database/seeds/data/services-data';
import {
  TigaCalendar1SettingsData,
  TigaCalendar2SettingsData,
  TigaCalendar3SettingsData,
  TigaCalendar4SettingsData,
  TigaCalendar5SettingsData
} from '../features/shared/lib/database/seeds/data/calendar-settings-data';
import { DateUtils } from '../features/shared/utils/date-utils';
import { initializeTestDatabase } from '../features/shared/lib/test-setup';

async function main() {
  try {
    console.log('🚀 Starting removalist business setup...\n');

    // Initialize database client
    console.log('🔧 Initializing database client...');
    await initializeTestDatabase();

    // Initialize seeders
    const businessSeeder = new BusinessSeeder();
    const authUserSeeder = new AuthUserSeeder();
    const userSeeder = new UserSeeder(authUserSeeder);
    const serviceSeeder = new ServiceSeeder();
    const calendarSettingsSeeder = new CalendarSettingsSeeder();
    const availabilitySlotsRepository = new AvailabilitySlotsRepository();
    const businessToolsRepository = new BusinessToolsRepository();
    const businessPromptRepository = new BusinessPromptRepository();
    const toolsSeeder = new ToolsSeeder();
    const promptsSeeder = new PromptsSeeder();

    // Step 1: Create Business
    console.log('📊 Creating business...');
    const business = await businessSeeder.createTigaRemovalistBusiness();
    console.log(`✅ Business created: ${business.name} (ID: ${business.id})`);

    // Step 2: Create Users (5 providers for Tiga)
    console.log('👥 Creating users...');
    const providers = [];

    const adminProvider = await userSeeder.createUniqueAdminProviderUser(business.id);
    console.log(`✅ Admin/Provider created: ${adminProvider.email}`);
    providers.push(adminProvider);

    // Create additional providers based on business configuration
    for (let i = 1; i < business.number_of_providers; i++) {
      const provider = await userSeeder.createUniqueProviderUser(business.id);
      console.log(`✅ Provider ${i + 1} created: ${provider.email}`);
      providers.push(provider);
    }

    const customer = await userSeeder.createUniqueCustomerUser(business.id);
    console.log(`✅ Customer created: ${customer.email}`);

    // Step 3: Create Services (all 5 Tiga services)
    console.log('🛠️ Creating services...');
    const serviceDataList = [
      removalistTigaService1Data,
      removalistTigaService2Data,
      removalistTigaService3Data,
      removalistTigaService4Data,
      removalistTigaService5Data
    ];

    const createdServices = [];
    for (const serviceData of serviceDataList) {
      const serviceWithBusinessId = { ...serviceData, business_id: business.id };
      const service = await serviceSeeder.createWithRequirements(serviceWithBusinessId);
      createdServices.push(service);
      console.log(`✅ Service created: ${service.name}`);
    }

    // Step 4: Create Calendar Settings (all 5 Tiga calendar settings)
    console.log('📅 Creating calendar settings...');
    const tigaCalendarSettings = [
      TigaCalendar1SettingsData,
      TigaCalendar2SettingsData,
      TigaCalendar3SettingsData,
      TigaCalendar4SettingsData,
      TigaCalendar5SettingsData
    ];

    const calendarSettings = [];
    for (let i = 0; i < providers.length; i++) {
      const calendarData = tigaCalendarSettings[i] || tigaCalendarSettings[0]; // Fallback to first if not enough calendar configs
      const settings = await calendarSettingsSeeder.createCalendarSettingsWith({
        ...calendarData,
        user_id: providers[i].id
      });
      calendarSettings.push(settings);
      console.log(`✅ Calendar settings created for provider ${i + 1}`);
    }

    // Step 5: Generate Availability
    console.log('🕐 Generating availability slots...');
    const tomorrowDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), 1);
    const tomorrowBusinessDate = DateUtils.extractDateString(tomorrowDate);
    await availabilitySlotsRepository.generateInitialBusinessAvailability(
      business.id,
      tomorrowBusinessDate,
      providers,
      calendarSettings,
      business.time_zone,
      30
    );
    console.log(`✅ Availability slots generated`);

    // Step 6: Link Tools
    console.log('🔧 Linking business tools...');
    const { removalistTools } = await import('../features/shared/lib/database/seeds/data/tools-data');
    let businessToolsCount = 0;

    for (const toolData of removalistTools) {
      const tool = await toolsSeeder.findOne({
        name: toolData.name,
        version: toolData.version
      });

      if (tool) {
        await businessToolsRepository.create({
          business_id: business.id,
          tool_id: tool.id,
          active: true
        });
        businessToolsCount++;
      }
    }
    console.log(`✅ Added ${businessToolsCount} tools to business`);

    // Step 7: Link Prompts (use current prompt version)
    console.log('📝 Linking prompts to business...');
    const { allAvailablePrompts } = await import('../features/shared/lib/database/seeds/data/prompts-data');
    const PROMPT_VERSION = 'v1.0.21'; // Use latest prompt version

    let businessPromptsCount = 0;
    for (const promptData of allAvailablePrompts) {
      // Find the prompt in database by name and the configured version
      const prompt = await promptsSeeder.findOne({
        prompt_name: promptData.prompt_name,
        prompt_version: PROMPT_VERSION
      });

      if (prompt) {
        await businessPromptRepository.create({
          business_id: business.id,
          prompt_id: prompt.id,
          is_active: true
        });
        businessPromptsCount++;
        console.log(`   ✅ Linked prompt: ${prompt.prompt_name} (${PROMPT_VERSION})`);
      } else {
        console.warn(`   ⚠️ Prompt not found: ${promptData.prompt_name} (${PROMPT_VERSION})`);
      }
    }
    console.log(`✅ Linked ${businessPromptsCount} prompts to business`);

    console.log('\n🎉 Removalist business setup completed!');
    console.log('📋 Setup Summary:');
    console.log(`   Business: ${business.name} (${business.phone_number})`);
    console.log(`   Admin/Provider: ${adminProvider.email}`);
    console.log(`   Additional Providers: ${providers.length - 1}`);
    console.log(`   Customer: ${customer.email}`);
    console.log(`   Services: ${createdServices.length}`);
    console.log(`   Calendar Settings: ${calendarSettings.length}`);
    console.log(`   Business Tools: ${businessToolsCount}`);
    console.log(`   Business Prompts: ${businessPromptsCount}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
