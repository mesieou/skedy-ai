/**
 * Business Setup Orchestrator
 *
 * Generic, reusable setup logic for creating businesses
 * Eliminates repetitive code across setup scripts
 */

import { BusinessSeeder } from '../seeds/business-seeder';
import { UserSeeder } from '../seeds/user-seeder';
import { AuthUserSeeder } from '../seeds/auth-user-seeder';
import { ServiceSeeder } from '../seeds/service-seeder';
import { CalendarSettingsSeeder } from '../seeds/calendar-settings-seeder';
import { AvailabilitySlotsRepository } from '../repositories/availability-slots-repository';
import { BusinessToolsRepository } from '../repositories/business-tools-repository';
import { BusinessPromptRepository } from '../repositories/business-prompt-repository';
import { ToolsSeeder } from '../seeds/tools-seeder';
import { PromptsSeeder } from '../seeds/prompts-seeder';
import { ToolsRepository } from '../repositories/tools-repository';
import { KnowledgeBaseManager } from '@/features/knowledge-base';
import { DateUtils } from '../../../utils/date-utils';
import type { CreateBusinessData, Business } from '../types/business';
import type { CreateUserData, User } from '../types/user';
import type { CreateAuthUserData } from '../types/auth-user';
import type { CreateServiceData, Service } from '../types/service';
import type { CreateToolData } from '../types/tools';
import type { CalendarSettings } from '../types/calendar-settings';

export interface BusinessSetupConfig {
  // Required
  businessData: CreateBusinessData;

  // Optional - Users
  adminUser?: {
    userData: CreateUserData;
    authData: CreateAuthUserData;
  };
  additionalProviders?: number;  // How many extra providers to create
  createCustomer?: boolean;       // Create a test customer?

  // Optional - Services
  services?: CreateServiceData[];

  // Optional - Calendar & Availability
  calendarSettings?: Array<{
    user_id?: string;  // Will be filled at runtime
    [key: string]: unknown;
  }>;
  generateAvailability?: {
    daysAhead: number;
  };

  // Optional - Tools & Prompts
  tools?: CreateToolData[];
  promptName?: string;        // e.g., PROMPTS_NAMES.MWAV_REMOVALIST
  promptVersion?: string;     // e.g., 'v1.0.0'

  // Optional - Knowledge Base
  loadWebsite?: {
    url: string;
    tableName?: string;
  };
}

export interface BusinessSetupResult {
  business: Business;
  adminUser?: User;
  providers: User[];
  customer?: User;
  services: Service[];
  toolsLinked: number;
  promptLinked: boolean;
  knowledgeBaseLoaded: boolean;
}

export class BusinessSetupOrchestrator {
  private businessSeeder: BusinessSeeder;
  private authUserSeeder: AuthUserSeeder;
  private userSeeder: UserSeeder;
  private serviceSeeder: ServiceSeeder;
  private calendarSettingsSeeder: CalendarSettingsSeeder;
  private availabilitySlotsRepo: AvailabilitySlotsRepository;
  private businessToolsRepo: BusinessToolsRepository;
  private businessPromptRepo: BusinessPromptRepository;
  private toolsSeeder: ToolsSeeder;
  private promptsSeeder: PromptsSeeder;
  private toolsRepo: ToolsRepository;

  constructor() {
    this.authUserSeeder = new AuthUserSeeder();
    this.businessSeeder = new BusinessSeeder();
    this.userSeeder = new UserSeeder(this.authUserSeeder);
    this.serviceSeeder = new ServiceSeeder();
    this.calendarSettingsSeeder = new CalendarSettingsSeeder();
    this.availabilitySlotsRepo = new AvailabilitySlotsRepository();
    this.businessToolsRepo = new BusinessToolsRepository();
    this.businessPromptRepo = new BusinessPromptRepository();
    this.toolsSeeder = new ToolsSeeder();
    this.promptsSeeder = new PromptsSeeder();
    this.toolsRepo = new ToolsRepository();
  }

  async setupBusiness(config: BusinessSetupConfig): Promise<BusinessSetupResult> {
    // Step 1: Create Business (REQUIRED)
    console.log('🏢 Creating business...');
    const business = await this.businessSeeder.createBusinessWith(config.businessData);
    console.log(`✅ Business created: ${business.name}`);

    // Temporary variables for building result
    const providers: User[] = [];
    const services: Service[] = [];
    let adminUser: User | undefined;
    let customer: User | undefined;

    // Step 2: Create Users (OPTIONAL)
    if (config.adminUser) {
      console.log('\n👤 Creating admin user...');
      const userData = { ...config.adminUser.userData, business_id: business.id };
      adminUser = await this.userSeeder.createUserWith(userData, config.adminUser.authData);
      console.log(`✅ Admin created: ${adminUser.email}`);
      providers.push(adminUser);
    }

    if (config.additionalProviders && config.additionalProviders > 0) {
      console.log(`\n👥 Creating ${config.additionalProviders} additional providers...`);
      for (let i = 0; i < config.additionalProviders; i++) {
        const provider = await this.userSeeder.createUniqueProviderUser(business.id);
        providers.push(provider);
        console.log(`✅ Provider ${i + 1} created`);
      }
    }

    if (config.createCustomer) {
      console.log('\n🛒 Creating customer...');
      customer = await this.userSeeder.createUniqueCustomerUser(business.id);
      console.log(`✅ Customer created: ${customer.email}`);
    }

    // Step 3: Create Services (OPTIONAL)
    if (config.services && config.services.length > 0) {
      console.log(`\n🛠️ Creating ${config.services.length} services...`);
      for (const serviceData of config.services) {
        const serviceWithBusinessId = { ...serviceData, business_id: business.id };
        const service = await this.serviceSeeder.createWithRequirements(serviceWithBusinessId);
        services.push(service);
        console.log(`✅ Service created: ${service.name}`);
      }
    }

    // Step 4: Create Calendar Settings (OPTIONAL)
    const calendarSettingsRecords: CalendarSettings[] = [];
    if (config.calendarSettings && config.calendarSettings.length > 0 && providers.length > 0) {
      console.log('\n📅 Creating calendar settings...');
      for (let i = 0; i < providers.length; i++) {
        const calendarData = config.calendarSettings[i] || config.calendarSettings[0];
        const settings = await this.calendarSettingsSeeder.createCalendarSettingsWith({
          ...calendarData,
          user_id: providers[i].id
        } as Parameters<typeof this.calendarSettingsSeeder.createCalendarSettingsWith>[0]);
        calendarSettingsRecords.push(settings);
        console.log(`✅ Calendar settings created for provider ${i + 1}`);
      }
    }

    // Step 5: Generate Availability (OPTIONAL)
    if (config.generateAvailability && providers.length > 0 && calendarSettingsRecords.length > 0) {
      console.log('\n🕐 Generating availability slots...');
      const tomorrowDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), 1);
      const tomorrowBusinessDate = DateUtils.extractDateString(tomorrowDate);

      await this.availabilitySlotsRepo.generateInitialBusinessAvailability(
        business.id,
        tomorrowBusinessDate,
        providers,
        calendarSettingsRecords,
        business.time_zone as string,
        config.generateAvailability.daysAhead
      );
      console.log(`✅ Availability generated for ${config.generateAvailability.daysAhead} days`);
    }

    // Step 6: Link Tools (OPTIONAL)
    let toolsLinkedCount = 0;
    if (config.tools && config.tools.length > 0) {
      console.log(`\n🔧 Linking ${config.tools.length} tools...`);

      for (const toolData of config.tools) {
        const tool = await this.toolsSeeder.findOne({ name: toolData.name });

        if (tool) {
          const existingBT = await this.businessToolsRepo.findOne({
            business_id: business.id,
            tool_id: tool.id
          });

          if (!existingBT) {
            await this.businessToolsRepo.create({
              business_id: business.id,
              tool_id: tool.id,
              active: true
            });
            toolsLinkedCount++;
          }
        } else {
          console.warn(`   ⚠️ Tool not found: ${toolData.name}`);
        }
      }
      console.log(`✅ Linked ${toolsLinkedCount} tools`);

      // Generate dynamic request_tool schema if request_tool is in the list
      const hasRequestTool = config.tools.some(t => t.name === 'request_tool');
      if (hasRequestTool) {
        console.log('\n🔧 Generating dynamic request_tool schema...');
        const requestTool = await this.toolsRepo.findOne({ name: 'request_tool' });
        if (requestTool) {
          await this.businessToolsRepo.updateRequestToolDynamicSchema(business.id, requestTool.id);
          console.log(`✅ request_tool configured`);
        }
      }
    }

    // Step 7: Link Prompt (OPTIONAL)
    let promptLinked = false;
    if (config.promptName && config.promptVersion) {
      console.log('\n📝 Linking prompt...');
      const prompt = await this.promptsSeeder.findOne({
        prompt_name: config.promptName,
        prompt_version: config.promptVersion
      });

      if (prompt) {
        await this.businessPromptRepo.create({
          business_id: business.id,
          prompt_id: prompt.id,
          is_active: true
        });
        promptLinked = true;
        console.log(`✅ Linked prompt: ${config.promptName} (${config.promptVersion})`);
      } else {
        console.warn(`⚠️ Prompt not found: ${config.promptName} (${config.promptVersion})`);
      }
    }

    // Step 8: Load Website Knowledge Base (OPTIONAL)
    let knowledgeBaseLoaded = false;
    if (config.loadWebsite) {
      console.log('\n📚 Loading website into knowledge base...');
      const kbManager = KnowledgeBaseManager.fromEnv();

      const kbResult = await kbManager.loadWebsite({
        websiteUrl: config.loadWebsite.url,
        databaseUrl: process.env.DATABASE_URL!,
        businessId: business.id,
        tableName: config.loadWebsite.tableName || 'documents',
        maxTokens: 8191
      });

      knowledgeBaseLoaded = kbResult.success;

      if (kbResult.success) {
        console.log(`✅ Website loaded (${(kbResult.duration / 1000).toFixed(1)}s)`);
      } else {
        console.warn(`⚠️ Knowledge base failed: ${kbResult.error}`);
      }
    }

    return {
      business,
      adminUser,
      providers,
      customer,
      services,
      toolsLinked: toolsLinkedCount,
      promptLinked,
      knowledgeBaseLoaded
    };
  }
}
