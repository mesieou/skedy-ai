import { NextRequest, NextResponse } from 'next/server';
import { BusinessSeeder } from '@/features/shared/lib/database/seeds/business-seeder';
import { UserSeeder } from '@/features/shared/lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '@/features/shared/lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '@/features/shared/lib/database/seeds/service-seeder';
import { CalendarSettingsSeeder } from '@/features/shared/lib/database/seeds/calendar-settings-seeder';
import { AvailabilitySlotsRepository } from '@/features/shared/lib/database/repositories/availability-slots-repository';
import { BusinessToolsRepository } from '@/features/shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '@/features/shared/lib/database/repositories/business-prompt-repository';
import { ToolsSeeder } from '@/features/shared/lib/database/seeds/tools-seeder';
import { PromptsSeeder } from '@/features/shared/lib/database/seeds/prompts-seeder';
import { DateUtils } from '@/features/shared/utils/date-utils';
import { sentry } from '@/features/shared/utils/sentryService';

// Import business configurations (same as setup-business.ts)
import {
  createUniqueRemovalistBusinessData,
  createUniqueMobileManicuristBusinessData,
  createUniquePlumberBusinessData
} from '@/features/shared/lib/database/seeds/data/business-data';

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
  plumberMaintenanceServiceData,
} from '@/features/shared/lib/database/seeds/data/services-data';

import {
  createRemovalistOwnerUserData,
  createManicuristOwnerUserData,
  createPlumberOwnerUserData,
  createRemovalistProviderUserData,
  createManicuristProviderUserData,
  createPlumberProviderUserData,
  createUniqueProviderUserData,
  createUniqueCustomerUserData
} from '@/features/shared/lib/database/seeds/data/user-data';

import {
  createRemovalistOwnerAuthUserData,
  createManicuristOwnerAuthUserData,
  createPlumberOwnerAuthUserData
} from '@/features/shared/lib/database/seeds/data/auth-user-data';

import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '@/features/shared/lib/database/seeds/data/calendar-settings-data';

// Configuration
const PROMPT_VERSION = 'v1.0.21';

// Business type configurations (same as setup-business.ts)
const businessConfigs = {
  removalist: {
    name: "Removalist (David Removals)",
    businessData: createUniqueRemovalistBusinessData,
    services: [removalistTigaService1Data, removalistTigaService2Data, removalistTigaService3Data, removalistTigaService4Data, removalistTigaService5Data],
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
    userData: createManicuristOwnerUserData,
    authData: createManicuristOwnerAuthUserData
  },
  plumber: {
    name: "Plumber (Fix-It Plumbing)",
    businessData: createUniquePlumberBusinessData,
    services: [plumberEmergencyServiceData, plumberMaintenanceServiceData],
    userData: createPlumberOwnerUserData,
    authData: createPlumberOwnerAuthUserData
  }
};

type BusinessType = keyof typeof businessConfigs;

// Admin API endpoint to setup businesses in production
export async function POST(request: NextRequest) {
  try {
    // No auth required for setup

    const { businessType } = await request.json();

    if (!businessType || !businessConfigs[businessType as BusinessType]) {
      return NextResponse.json({
        error: 'Invalid business type. Available: removalist, manicurist, plumber'
      }, { status: 400 });
    }

    const config = businessConfigs[businessType as BusinessType];

    sentry.addBreadcrumb('Starting business setup via API', 'admin-api', {
      businessType,
      businessName: config.name
    });

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
    const businessData = config.businessData();
    const business = await businessSeeder.createWith(businessData);

    // Step 2: Create Users
    const providers = [];

    // Create business owner (admin/provider)
    const ownerUserData = config.userData(business.id);
    const ownerAuthData = config.authData();
    const adminProvider = await userSeeder.createUserWith(ownerUserData, ownerAuthData);
    providers.push(adminProvider);

    // Create additional provider if business has multiple providers
    let provider = null;
    if (business.number_of_providers >= 2) {
      let providerUserData;
      let providerAuthData;

      if (businessType === 'removalist') {
        providerUserData = createRemovalistProviderUserData(business.id);
        providerAuthData = { email: "james@davidremovals.com", password: "demo123", email_confirm: true };
      } else if (businessType === 'manicurist') {
        providerUserData = createManicuristProviderUserData(business.id);
        providerAuthData = { email: "emma@nailsonthego.com.au", password: "demo123", email_confirm: true };
      } else if (businessType === 'plumber') {
        providerUserData = createPlumberProviderUserData(business.id);
        providerAuthData = { email: "tom@fixitplumbing.com.au", password: "demo123", email_confirm: true };
      } else {
        providerUserData = createUniqueProviderUserData(business.id);
        providerAuthData = { email: `provider+${Date.now()}@${business.email.split('@')[1]}`, password: "demo123", email_confirm: true };
      }

      provider = await userSeeder.createUserWith(providerUserData, providerAuthData);
      providers.push(provider);
    }

    // Create customer
    const customer = await userSeeder.createUserWith(
      createUniqueCustomerUserData(business.id),
      { email: `customer+${Date.now()}@gmail.com`, password: "demo123", email_confirm: true }
    );

    // Step 3: Create Services
    const createdServices = [];
    for (const serviceData of config.services) {
      const serviceWithBusinessId = { ...serviceData, business_id: business.id };
      const service = await serviceSeeder.createWithRequirements(serviceWithBusinessId);
      createdServices.push(service);
    }

    // Step 4: Create Calendar Settings
    const calendarSettings = [];
    for (let i = 0; i < providers.length; i++) {
      const calendarData = i === 0 ? weekdayCalendarSettingsData : weekendCalendarSettingsData;
      const settings = await calendarSettingsSeeder.createCalendarSettingsWith({
        ...calendarData,
        user_id: providers[i].id
      });
      calendarSettings.push(settings);
    }

    // Step 5: Generate Availability
    const { date: todayInBusiness } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), business.time_zone);
    const tomorrowInBusiness = DateUtils.addDaysUTC(DateUtils.createSlotTimestamp(todayInBusiness, '00:00:00'), 1);
    const tomorrowBusinessDate = DateUtils.extractDateString(tomorrowInBusiness);

    await availabilitySlotsRepository.generateInitialBusinessAvailability(
      business.id,
      tomorrowBusinessDate,
      providers,
      calendarSettings,
      business.time_zone,
      30
    );

    // Step 6: Link Tools
    const { allAvailableTools } = await import('@/features/shared/lib/database/seeds/data/tools-data');
    let businessToolsCount = 0;

    for (const toolData of allAvailableTools) {
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

    // Step 7: Link Prompts
    const { allAvailablePrompts } = await import('@/features/shared/lib/database/seeds/data/prompts-data');
    let businessPromptsCount = 0;

    for (const promptData of allAvailablePrompts) {
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
      }
    }

    // Success tracking
    sentry.addBreadcrumb('Business setup completed via API', 'admin-api', {
      businessName: business.name,
      businessId: business.id,
      businessType: businessType,
      servicesCount: createdServices.length,
      providersCount: providers.length
    });

    return NextResponse.json({
      success: true,
      message: `${config.name} setup completed successfully`,
      data: {
        business: {
          id: business.id,
          name: business.name,
          phone_number: business.phone_number,
          email: business.email
        },
        users: {
          owner: adminProvider.email,
          provider: provider?.email,
          customer: customer.email
        },
        counts: {
          services: createdServices.length,
          calendarSettings: calendarSettings.length,
          tools: businessToolsCount,
          prompts: businessPromptsCount
        }
      }
    });

  } catch (error) {
    console.error('❌ Business setup API failed:', error);

    sentry.trackError(error as Error, {
      sessionId: 'admin-api-setup',
      operation: 'business_setup_api',
      metadata: {
        endpoint: '/api/admin/setup-business'
      }
    });

    return NextResponse.json({
      error: 'Business setup failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
