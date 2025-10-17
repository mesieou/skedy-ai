import { OnboardingSession } from '../types/onboarding-session';
import { Business, CreateBusinessData, BusinessCategory, SubscriptionType, PaymentMethod, DepositType } from '@/features/shared/lib/database/types/business';
import { UserRole } from '@/features/shared/lib/database/types/user';
import { LocationType } from '@/features/shared/lib/database/types/service';
import { BusinessRepository } from '@/features/shared/lib/database/repositories/business-repository';
import { UserRepository } from '@/features/shared/lib/database/repositories/user-repository';
import { ServiceSeeder } from '@/features/shared/lib/database/seeds/service-seeder';
import { CalendarSettingsSeeder } from '@/features/shared/lib/database/seeds/calendar-settings-seeder';
import { BusinessToolsRepository } from '@/features/shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '@/features/shared/lib/database/repositories/business-prompt-repository';
import { ToolsSeeder } from '@/features/shared/lib/database/seeds/tools-seeder';
import { PromptsSeeder } from '@/features/shared/lib/database/seeds/prompts-seeder';

/**
 * Business Setup Service
 * Creates and configures business entities based on onboarding data
 * 
 * This is the "executor" - it takes the collected onboarding data
 * and creates all necessary database records
 */
export class BusinessSetupService {
  private businessRepository: BusinessRepository;
  private userRepository: UserRepository;
  private serviceSeeder: ServiceSeeder;
  private calendarSettingsSeeder: CalendarSettingsSeeder;
  private businessToolsRepository: BusinessToolsRepository;
  private businessPromptRepository: BusinessPromptRepository;
  private toolsSeeder: ToolsSeeder;
  private promptsSeeder: PromptsSeeder;

  constructor() {
    this.businessRepository = new BusinessRepository();
    this.userRepository = new UserRepository();
    this.serviceSeeder = new ServiceSeeder();
    this.calendarSettingsSeeder = new CalendarSettingsSeeder();
    this.businessToolsRepository = new BusinessToolsRepository();
    this.businessPromptRepository = new BusinessPromptRepository();
    this.toolsSeeder = new ToolsSeeder();
    this.promptsSeeder = new PromptsSeeder();
  }

  /**
   * Create business from onboarding session
   * This is the main method that orchestrates business creation
   */
  async createBusinessFromOnboarding(session: OnboardingSession): Promise<Business> {
    console.log(`🏢 [BusinessSetup] Creating business from onboarding session: ${session.id}`);

    try {
      // Step 1: Create business entity
      const business = await this.createBusiness(session);
      console.log(`✅ [BusinessSetup] Business created: ${business.name} (${business.id})`);

      // Step 2: Link owner as admin user
      await this.linkOwnerAsAdmin(business.id, session.userId);
      console.log(`✅ [BusinessSetup] Owner linked as admin`);

      // Step 3: Create services
      if (session.data.services && session.data.services.length > 0) {
        await this.createServices(business.id, session.data.services);
        console.log(`✅ [BusinessSetup] Created ${session.data.services.length} services`);
      }

      // Step 4: Setup calendar settings for providers
      if (session.data.numberOfProviders) {
        await this.setupProviderCalendars(business.id, session.userId, session.data.numberOfProviders);
        console.log(`✅ [BusinessSetup] Setup calendars for ${session.data.numberOfProviders} providers`);
      }

      // Step 5: Link tools
      if (session.data.selectedTools && session.data.selectedTools.length > 0) {
        await this.linkTools(business.id, session.data.selectedTools);
        console.log(`✅ [BusinessSetup] Linked ${session.data.selectedTools.length} tools`);
      }

      // Step 6: Link prompts
      if (session.data.selectedPrompts && session.data.selectedPrompts.length > 0) {
        await this.linkPrompts(business.id, session.data.selectedPrompts);
        console.log(`✅ [BusinessSetup] Linked ${session.data.selectedPrompts.length} prompts`);
      }

      console.log(`🎉 [BusinessSetup] Business setup complete: ${business.id}`);
      return business;

    } catch (error) {
      console.error(`❌ [BusinessSetup] Failed to create business:`, error);
      throw error;
    }
  }

  /**
   * Create business entity
   */
  private async createBusiness(session: OnboardingSession): Promise<Business> {
    const analysis = session.data.businessAnalysis;
    const confirmed = session.data.confirmedBusinessInfo;

    // Merge analysis and confirmed data
    const businessData: CreateBusinessData = {
      // Basic info
      name: (confirmed?.name as string) || analysis?.businessName || 'Unnamed Business',
      email: (confirmed?.email as string) || analysis?.email || '',
      phone_number: (confirmed?.phone_number as string) || analysis?.phone || '',
      address: (confirmed?.address as string) || analysis?.address || '',
      
      // Business settings
      business_category: this.mapCategory((confirmed?.business_category as string) || analysis?.category),
      time_zone: (confirmed?.time_zone as string) || 'Australia/Sydney',
      language: 'en',
      
      // Financial settings
      charges_gst: true,
      prices_include_gst: true,
      gst_rate: 0.1,
      charges_deposit: false,
      payment_processing_fee_percentage: 2.9,
      booking_platform_fee_percentage: 5.0,
      currency_code: 'AUD',
      minimum_charge: 0,
      
      // Service model
      offers_mobile_services: analysis?.hasMobileServices ?? true,
      offers_location_services: analysis?.hasLocationServices ?? false,
      
      // Provider settings
      number_of_providers: session.data.numberOfProviders || 1,
      
      // Subscription
      subscription_type: SubscriptionType.FREE,
      payment_methods: [PaymentMethod.STRIPE],
      preferred_payment_method: PaymentMethod.STRIPE,
      deposit_type: DepositType.PERCENTAGE,
      
      // Website
      website_url: session.data.websiteUrl || null,
      
      // API key (use default for now)
      openai_api_key_name: 'DEFAULT',
      
      // Stripe (will be set up later)
      stripe_connect_account_id: session.data.stripeConnectAccountId || null,
      stripe_account_status: null,
      
      // WhatsApp (optional)
      whatsapp_number: null,
      whatsapp_phone_number_id: null,
      
      // Twilio (optional)
      twilio_number: null
    };

    return await this.businessRepository.create(businessData);
  }

  /**
   * Link owner as admin user
   */
  private async linkOwnerAsAdmin(businessId: string, userId: string): Promise<void> {
    // Check if user exists
    const user = await this.userRepository.findOne({ id: userId });
    
    if (!user) {
      console.warn(`⚠️ [BusinessSetup] User not found: ${userId}, skipping admin link`);
      return;
    }

    // Update user to be admin of this business
    await this.userRepository.updateOne({ id: userId }, {
      business_id: businessId,
      role: UserRole.ADMIN
    });
  }

  /**
   * Create services from onboarding data
   */
  private async createServices(
    businessId: string,
    services: Array<{
      name: string;
      description?: string;
      price?: number;
      duration?: number;
      requiresTravel?: boolean;
    }>
  ): Promise<void> {
    for (const service of services) {
      const serviceData = {
        business_id: businessId,
        name: service.name,
        description: service.description || '',
        base_price: service.price || 0,
        duration: service.duration || 60,
        requires_travel: service.requiresTravel ?? false,
        is_active: true,
        // Required fields for MobileService
        location_type: LocationType.CUSTOMER as LocationType.CUSTOMER,
        pricing_config: {
          base_price: service.price || 0,
          travel_fee_per_km: 0,
          minimum_travel_fee: 0
        },
        // Default values
        buffer_time: 0,
        max_advance_booking_days: 90,
        min_advance_booking_hours: 24,
        cancellation_policy: 'standard',
        requires_deposit: false,
        service_requirements: []
      };

      await this.serviceSeeder.createWithRequirements(serviceData as any);
    }
  }

  /**
   * Setup calendar settings for providers
   */
  private async setupProviderCalendars(
    businessId: string,
    ownerId: string,
    numberOfProviders: number
  ): Promise<void> {
    // Get owner user
    const owner = await this.userRepository.findOne({ id: ownerId });
    
    if (!owner) {
      console.warn(`⚠️ [BusinessSetup] Owner not found: ${ownerId}`);
      return;
    }

    // Create default calendar settings for owner
    const defaultWorkingHours = {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '13:00', enabled: false },
      sunday: { start: '09:00', end: '17:00', enabled: false }
    };

    await this.calendarSettingsSeeder.createCalendarSettingsWith({
      user_id: owner.id,
      settings: {},
      working_hours: defaultWorkingHours
    });

    // TODO: Create additional provider users if numberOfProviders > 1
    // This would involve creating auth users and linking them
  }

  /**
   * Link tools to business
   */
  private async linkTools(businessId: string, toolNames: string[]): Promise<void> {
    for (const toolName of toolNames) {
      // Find tool by name (latest version)
      const tool = await this.toolsSeeder.findOne({ name: toolName });
      
      if (!tool) {
        console.warn(`⚠️ [BusinessSetup] Tool not found: ${toolName}`);
        continue;
      }

      // Link to business
      await this.businessToolsRepository.create({
        business_id: businessId,
        tool_id: tool.id,
        active: true
      });
    }
  }

  /**
   * Link prompts to business
   */
  private async linkPrompts(businessId: string, promptNames: string[]): Promise<void> {
    const PROMPT_VERSION = 'v1.0.21'; // Use latest version

    for (const promptName of promptNames) {
      // Find prompt by name and version
      const prompt = await this.promptsSeeder.findOne({
        prompt_name: promptName,
        prompt_version: PROMPT_VERSION
      });
      
      if (!prompt) {
        console.warn(`⚠️ [BusinessSetup] Prompt not found: ${promptName}`);
        continue;
      }

      // Link to business
      await this.businessPromptRepository.create({
        business_id: businessId,
        prompt_id: prompt.id,
        is_active: true
      });
    }
  }

  /**
   * Map category string to BusinessCategory enum
   */
  private mapCategory(category?: string): BusinessCategory {
    if (!category) return BusinessCategory.TECHNOLOGY;

    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('removalist') || categoryLower.includes('moving')) {
      return BusinessCategory.REMOVALIST;
    }
    if (categoryLower.includes('manicur') || categoryLower.includes('nail')) {
      return BusinessCategory.MANICURIST;
    }
    if (categoryLower.includes('plumb')) {
      return BusinessCategory.PLUMBER;
    }
    
    return BusinessCategory.TECHNOLOGY;
  }

  /**
   * Validate onboarding session is ready for business creation
   */
  validateSession(session: OnboardingSession): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required data
    if (!session.data.confirmedBusinessInfo?.name && !session.data.businessAnalysis?.businessName) {
      errors.push('Business name is required');
    }

    if (!session.data.confirmedBusinessInfo?.email && !session.data.businessAnalysis?.email) {
      errors.push('Business email is required');
    }

    if (!session.data.services || session.data.services.length === 0) {
      errors.push('At least one service is required');
    }

    if (!session.data.numberOfProviders || session.data.numberOfProviders < 1) {
      errors.push('At least one provider is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
