import { BusinessPromptRepository } from '../../shared/lib/database/repositories/business-prompt-repository';
import { PROMPTS_NAMES } from '../../shared/lib/database/types/prompt';
import { BusinessRepository } from '../../shared/lib/database/repositories/business-repository';
import { BusinessToolsRepository } from '../../shared/lib/database/repositories/business-tools-repository';
import { sentry } from '../../shared/utils/sentryService';
import type { Session } from '../sessions/session';
import assert from 'assert';
import { ServiceRepository } from '../../shared/lib/database/repositories/service-repository';

/**
 * Generate prompt with business and tool information injected
 * Uses tools already loaded in session
 */
export async function addPromptToSession(session: Session): Promise<void> {
  const startTime = Date.now();

  try {
    const business = session.businessEntity;
    console.log(`🤖 [GeneratePrompt] Generating prompt for business: ${business.name} (${business.id})`);

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
    const activeToolNames = await businessToolsRepo.getActiveToolNamesForBusiness(business.id);

    // Get all service names for this business
    const services = await serviceRepo.findAll({}, { business_id: business.id });
    const serviceNames = services.map(service => service.name);
    const serviceNamesList = serviceNames.join(', ');
    // Get business info string
    const businessInfoString = businessRepo.buildBusinessInfoForCustomers(business);

    // Get active prompt data for business in ONE query using JOIN
    const promptData = await businessPromptRepo.getActivePromptByNameForBusiness(business.id, PROMPTS_NAMES.MAIN_CONVERSATION);

    assert(promptData, `${PROMPTS_NAMES.MAIN_CONVERSATION} prompt not found for business ${business.id}`);


    // Inject data into prompt using replacements map
    const replacements = {
      '{BUSINESS_TYPE}': business.business_category, // Direct use of category (removalist, manicurist, plumber)
      '{LIST OF SERVICES}': serviceNamesList,
      '{BUSINESS INFO}': businessInfoString,
    };

    const finalPrompt = Object.entries(replacements).reduce(
      (prompt, [placeholder, value]) => prompt!.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value),
      promptData.prompt_content
    );
    console.log('Final prompt:', finalPrompt);
    console.log('Business type injected:', business.business_category);
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
