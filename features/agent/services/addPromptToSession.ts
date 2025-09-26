import { BusinessPromptRepository } from '../../shared/lib/database/repositories/business-prompt-repository';
import { PROMPTS_NAMES } from '../../shared/lib/database/types/prompt';
import { BusinessRepository } from '../../shared/lib/database/repositories/business-repository';
import { BusinessToolsRepository } from '../../shared/lib/database/repositories/business-tools-repository';
import { sentry } from '../../shared/utils/sentryService';
import type { Session } from '../sessions/session';
import assert from 'assert';
import { ServiceRepository } from '../../shared/lib/database/repositories/service-repository';
import { DateUtils } from '../../shared/utils/date-utils';

/**
 * Generate prompt with business and tool information injected
 * Uses tools already loaded in session
 */
export async function addPromptToSession(session: Session): Promise<void> {
  const startTime = Date.now();

  try {
    const business = session.businessEntity;
    console.log(`🤖 [GeneratePrompt] Generating prompt for business: ${business.name} (${business.id})`);
    console.log(`🔧 [GeneratePrompt] NEW CODE DEPLOYED - About to get active tool names...`);

    // Add breadcrumb
    sentry.addBreadcrumb(`Generating prompt`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session.id
    });

    const businessPromptRepo = new BusinessPromptRepository();
    const businessRepo = new BusinessRepository();
    const businessToolsRepo = new BusinessToolsRepository();
    const serviceRepo = new ServiceRepository();
    // Get all active tool names for this business (for prompt reference)
    console.log(`🔧 [GeneratePrompt] Calling getActiveToolNamesForBusiness for business: ${business.id}`);
    let activeToolNames: string[] = [];
    try {
      activeToolNames = await businessToolsRepo.getActiveToolNamesForBusiness(business.id);
      console.log(`🤖 [GeneratePrompt] Active tool names retrieved: ${JSON.stringify(activeToolNames)}`);
    } catch (error) {
      console.error(`❌ [GeneratePrompt] Failed to get active tool names:`, error);
      throw error; // Re-throw to see the full error
    }
    // Get all service names for this business
    console.log(`🚨 [GeneratePrompt] TEMPORARY: Using hardcoded services to bypass database hang`);
    const hardcodedServices = [{ name: 'Removalist Service' }, { name: 'Packing Service' }];
    const services = hardcodedServices;
    console.log(`🤖 [GeneratePrompt] Services (hardcoded): ${JSON.stringify(services)}`);
    const serviceNames = services.map(service => service.name);
    const serviceNamesList = serviceNames.join(', ');
    // Get business info string
    const businessInfoString = businessRepo.buildBusinessInfoForCustomers(business);
    console.log(`🤖 [GeneratePrompt] Business info string: ${businessInfoString}`);
    // Get active prompt data for business in ONE query using JOIN
    console.log(`🚨 [GeneratePrompt] TEMPORARY: Using hardcoded prompt to bypass database hang`);
    const hardcodedPromptData = {
      prompt_name: PROMPTS_NAMES.MAIN_CONVERSATION,
      prompt_version: 'v1.0.0',
      prompt_content: 'You are Skedy, an AI receptionist for {BUSINESS_TYPE} services. Help customers with bookings and quotes. Available tools: {TOOL_NAMES}. Services: {LIST OF SERVICES}. Business info: {BUSINESS INFO}. Current date: {CURRENT_DATE}, time: {CURRENT_TIME}.'
    };
    const promptData = hardcodedPromptData;
    console.log(`🤖 [GeneratePrompt] Prompt data (hardcoded): ${promptData.prompt_name} v${promptData.prompt_version}`);

    assert(promptData, `${PROMPTS_NAMES.MAIN_CONVERSATION} prompt not found for business ${business.id}`);


    // Get current date and time in business timezone using DateUtils
    const nowUTC = DateUtils.nowUTC();
    const { date: localDate, time: localTime } = DateUtils.convertUTCToTimezone(nowUTC, business.time_zone);

    // Format for display
    const currentDate = DateUtils.formatDateForDisplay(localDate);
    const currentTime = DateUtils.formatTimeForDisplay(localTime.substring(0, 5)); // Remove seconds

    const currentDateTime = `${currentDate} at ${currentTime}`;

    // Inject data into prompt using replacements map
    const replacements = {
      '{BUSINESS_TYPE}': business.business_category, // Direct use of category (removalist, manicurist, plumber)
      '{LIST OF SERVICES}': serviceNamesList,
      '{BUSINESS INFO}': businessInfoString,
      '{CURRENT_DATE}': currentDateTime,
    };

    const finalPrompt = Object.entries(replacements).reduce(
      (prompt, [placeholder, value]) => prompt!.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value),
      promptData.prompt_content
    );
    console.log('Final prompt:', finalPrompt);
    console.log('Business type injected:', business.business_category);
    console.log('Current date injected:', currentDateTime);
    console.log('Service names:', serviceNames);
    console.log('Business info:', businessInfoString);
    console.log('Active tool names:', activeToolNames);

    // Store prompt, tool names, and service names in session
    session.aiInstructions = finalPrompt!;
    session.promptName = promptData.prompt_name;
    session.promptVersion = promptData.prompt_version;
    session.allAvailableToolNames = activeToolNames;
    session.serviceNames = serviceNames; // Populate for getServiceDetails fuzzy matching

    const duration = Date.now() - startTime;
    console.log(`✅ [GeneratePrompt] Generated prompt (${finalPrompt!.length} chars) with ${activeToolNames.length} available tools (${duration}ms)`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Prompt generated successfully`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session.id,
      promptLength: finalPrompt!.length,
      allToolsCount: activeToolNames.length,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [GeneratePrompt] Failed to generate prompt for business ${session.businessEntity.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessEntity.id,
      operation: 'generate_prompt',
      metadata: {
        duration,
        businessName: session.businessEntity.name
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
