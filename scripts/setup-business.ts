#!/usr/bin/env tsx

/**
 * Generic Business Setup Script
 *
 * Creates a complete business setup for any business type.
 * Usage: ./scripts/setup-business.ts <business-type>
 *
 * Supported business types:
 * - removalist
 * - manicurist
 * - plumber
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
import { DateUtils } from '../features/shared/utils/date-utils';
import { initializeTestDatabase } from '../features/shared/lib/test-setup';
import { sentry } from '../features/shared/utils/sentryService';

// Import all business data from @data/ files
import {
  createUniqueRemovalistBusinessData,
  createUniqueMobileManicuristBusinessData,
  createUniquePlumberBusinessData
} from '../features/shared/lib/database/seeds/data/business-data';

import {
  removalistTigaService1Data,
  removalistTigaService2Data,
  removalistTigaService3Data,
  removalistTigaService4Data,
  removalistTigaService5Data,
  manicuristExample5Service1Data,
  manicuristExample5Service2Data,
  manicuristExample6ServiceData,
  plumberEmergencyServiceData,
  plumberMaintenanceServiceData
} from '../features/shared/lib/database/seeds/data/services-data';

import {
  createRemovalistOwnerUserData,
  createManicuristOwnerUserData,
  createPlumberOwnerUserData,
  createUniqueProviderUserData,
  createUniqueCustomerUserData
} from '../features/shared/lib/database/seeds/data/user-data';

import {
  createRemovalistOwnerAuthUserData,
  createManicuristOwnerAuthUserData,
  createPlumberOwnerAuthUserData
} from '../features/shared/lib/database/seeds/data/auth-user-data';

import {
  weekdayCalendarSettingsData,
  weekendCalendarSettingsData,
  TigaCalendar1SettingsData,
  TigaCalendar2SettingsData,
  TigaCalendar3SettingsData,
  TigaCalendar4SettingsData,
  TigaCalendar5SettingsData
} from '../features/shared/lib/database/seeds/data/calendar-settings-data';

// Configuration
const PROMPT_VERSION = 'v1.0.21'; // Use latest prompt version

// Business type configurations
const businessConfigs = {
  removalist: {
    name: "Removalist (David Removals)",
    businessData: createUniqueRemovalistBusinessData,
    services: [
      removalistTigaService1Data,
      removalistTigaService2Data,
      removalistTigaService3Data,
      removalistTigaService4Data,
      removalistTigaService5Data
    ],
    calendarSettings: [
      TigaCalendar1SettingsData,
      TigaCalendar2SettingsData,
      TigaCalendar3SettingsData,
      TigaCalendar4SettingsData,
      TigaCalendar5SettingsData
    ],
    userData: createRemovalistOwnerUserData,
    authData: createRemovalistOwnerAuthUserData
  },
  manicurist: {
    name: "Manicurist (Nails on the Go)",
    businessData: createUniqueMobileManicuristBusinessData,
    services: [
      manicuristExample5Service1Data,
      manicuristExample5Service2Data,
      manicuristExample6ServiceData
    ],
    calendarSettings: [weekdayCalendarSettingsData, weekendCalendarSettingsData],
    userData: createManicuristOwnerUserData,
    authData: createManicuristOwnerAuthUserData
  },
  plumber: {
    name: "Plumber (Fix-It Plumbing)",
    businessData: createUniquePlumberBusinessData,
    services: [plumberEmergencyServiceData, plumberMaintenanceServiceData],
    calendarSettings: [weekdayCalendarSettingsData, weekendCalendarSettingsData],
    userData: createPlumberOwnerUserData,
    authData: createPlumberOwnerAuthUserData
  }
};

type BusinessType = keyof typeof businessConfigs;

async function setupBusiness(businessType: BusinessType) {
  const config = businessConfigs[businessType];

  try {
    console.log(`🚀 Starting ${config.name} setup...\n`);

    // Initialize database client
    console.log('🔧 Initializing database client...');
    await initializeTestDatabase();

    // Initialize seeders and repositories
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
    const businessData = config.businessData();
    const business = await businessSeeder.createWith(businessData);
    console.log(`✅ Business created: ${business.name} (ID: ${business.id})`);

    // Step 2: Create Users
    console.log('👥 Creating users...');
    const providers = [];

    // Create business owner (admin/provider)
    const ownerUserData = config.userData(business.id);
    const ownerAuthData = config.authData();
    const adminProvider = await userSeeder.createUserWith(ownerUserData, ownerAuthData);
    console.log(`✅ Business Owner created: ${adminProvider.email}`);
    providers.push(adminProvider);

    // Create additional providers based on business configuration
    const targetProviderCount = businessType === 'removalist' ? 5 : business.number_of_providers;

    for (let i = 1; i < targetProviderCount; i++) {
      let providerAuthData;

      // Use unique provider data for all business types to avoid phone number conflicts
      const providerUserData = createUniqueProviderUserData(business.id);

      const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);

      if (businessType === 'removalist') {
        providerAuthData = { email: `provider${i}+${uniqueId}@davidremovals.com`, password: "demo123", email_confirm: true };
      } else if (businessType === 'manicurist') {
        providerAuthData = { email: `provider${i}+${uniqueId}@nailsonthego.com.au`, password: "demo123", email_confirm: true };
      } else if (businessType === 'plumber') {
        providerAuthData = { email: `provider${i}+${uniqueId}@fixitplumbing.com.au`, password: "demo123", email_confirm: true };
      } else {
        providerAuthData = { email: `provider${i}+${uniqueId}@${business.email.split('@')[1]}`, password: "demo123", email_confirm: true };
      }

      const provider = await userSeeder.createUserWith(providerUserData, providerAuthData);
      console.log(`✅ Provider ${i + 1} created: ${provider.email}`);
      providers.push(provider);
    }

    // Create customer
    const customer = await userSeeder.createUserWith(
      createUniqueCustomerUserData(business.id),
      { email: `customer+${Date.now()}@gmail.com`, password: "demo123", email_confirm: true }
    );
    console.log(`✅ Customer created: ${customer.email}`);

    // Step 3: Create Services
    console.log('🛠️ Creating services...');
    const createdServices = [];
    for (const serviceData of config.services) {
      const serviceWithBusinessId = { ...serviceData, business_id: business.id };
      const service = await serviceSeeder.createWithRequirements(serviceWithBusinessId);
      createdServices.push(service);
      console.log(`✅ Service created: ${service.name}`);
    }

    // Step 4: Create Calendar Settings
    console.log('📅 Creating calendar settings...');
    const calendarSettings = [];
    const configCalendarSettings = config.calendarSettings || [weekdayCalendarSettingsData, weekendCalendarSettingsData];

    for (let i = 0; i < providers.length; i++) {
      const calendarData = configCalendarSettings[i] || configCalendarSettings[0]; // Fallback to first if not enough
      const settings = await calendarSettingsSeeder.createCalendarSettingsWith({
        ...calendarData,
        user_id: providers[i].id
      });
      calendarSettings.push(settings);
      console.log(`✅ Calendar settings created for provider ${i + 1}`);
    }

    // Step 5: Generate Availability
    console.log('🕐 Generating availability slots...');

    // Get tomorrow in business timezone
    const { date: todayInBusiness } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), business.time_zone);
    const tomorrowInBusiness = DateUtils.addDaysUTC(DateUtils.createSlotTimestamp(todayInBusiness, '00:00:00'), 1);
    const tomorrowBusinessDate = DateUtils.extractDateString(tomorrowInBusiness);

    await availabilitySlotsRepository.generateInitialBusinessAvailability(
      business.id,
      tomorrowBusinessDate, // Pass business date - function will handle UTC conversion
      providers,
      calendarSettings,
      business.time_zone,
      30
    );
    console.log(`✅ Availability slots generated`);

    // Step 6: Link Tools (find existing tools, don't create new ones)
    console.log('🔧 Linking business tools...');
    const { removalistTools, allAvailableTools } = await import('../features/shared/lib/database/seeds/data/tools-data');

    // Use business-specific tools based on business type
    const businessTools = businessType === 'removalist' ? removalistTools : allAvailableTools;
    let businessToolsCount = 0;

    for (const toolData of businessTools) {
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
    console.log(`✅ Linked ${businessToolsCount} tools to business`);

    // Step 7: Link Prompts (use all available prompts from data file with specific version)
    console.log(`📝 Linking prompts to business (version: ${PROMPT_VERSION})...`);
    const { allAvailablePrompts } = await import('../features/shared/lib/database/seeds/data/prompts-data');

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

    // Add breadcrumb for successful setup
    sentry.addBreadcrumb(`Business setup completed`, 'business-setup', {
      businessName: business.name,
      businessId: business.id,
      businessType: businessType,
      servicesCount: createdServices.length,
      providersCount: providers.length
    });

    console.log(`\n🎉 ${config.name} setup completed!`);
    console.log('📋 Setup Summary:');
    console.log(`   Business: ${business.name} (${business.phone_number})`);
    console.log(`   Business ID: ${business.id}`);
    console.log(`   Owner: ${adminProvider.email}`);
    console.log(`   Total Providers: ${providers.length}`);
    console.log(`   Customer: ${customer.email}`);
    console.log(`   Services: ${createdServices.length}`);
    console.log(`   Calendar Settings: ${calendarSettings.length}`);
    console.log(`   Business Tools: ${businessToolsCount}`);
    console.log(`   Business Prompts: ${businessPromptsCount}`);

    return {
      business,
      services: createdServices,
      users: { adminProvider, providers: providers.slice(1), customer },
      toolsCount: businessToolsCount,
      promptsCount: businessPromptsCount
    };

  } catch (error) {
    console.error(`❌ ${config.name} setup failed:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'business-setup',
      businessId: 'unknown',
      operation: 'business_setup',
      metadata: {
        businessType: businessType,
        businessName: config.name
      }
    });

    throw error;
  }
}

async function main() {
  const businessType = process.argv[2] as BusinessType;

  if (!businessType || !businessConfigs[businessType]) {
    console.error('❌ Please specify a valid business type:');
    console.error('   Usage: ./scripts/setup-business.ts <business-type>');
    console.error('   Available types: removalist, manicurist, plumber');
    process.exit(1);
  }

  try {
    await setupBusiness(businessType);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
