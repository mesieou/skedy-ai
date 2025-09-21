import { BusinessPromptRepository } from '../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../shared/lib/database/repositories/business-repository';
import { ToolsRepository } from '../../shared/lib/database/repositories/tools-repository';
import { sentry } from '../../shared/utils/sentryService';
import type { Session } from '../sessions/session';
import assert from 'assert';

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
    const toolRepo = new ToolsRepository();

    // Get all active tools for this business (for prompt reference)
    const allTools = await toolRepo.findAll({}, {
      business_id: business.id,
      is_active: true
    });

    // Get business info string
    const businessInfoString = businessRepo.buildBusinessInfoForCustomers(business);

    // Get active prompt content for business in ONE query using JOIN
    const promptContent = await businessPromptRepo.getActivePromptContentForBusiness(business.id);

    assert(promptContent, `No active prompt found for business ${business.id}`);

    // Create tool list for prompt (all available tools for AI reference)
    const allToolsList = allTools.map(t => t.name).join(', ');

    // Inject data into prompt using replacements map
    const replacements = {
      '{LIST OF TOOLS}': allToolsList,
      '{BUSINESS INFO}': businessInfoString,
    };

    const finalPrompt = Object.entries(replacements).reduce(
      (prompt, [placeholder, value]) => prompt!.replace(new RegExp(placeholder, 'g'), value),
      promptContent
    );

    // Store prompt and tool names in session
    session.aiInstructions = finalPrompt!;
    session.allAvailableToolNames = allTools.map(t => t.name);

    const duration = Date.now() - startTime;
    console.log(`✅ [GeneratePrompt] Generated prompt (${finalPrompt!.length} chars) with ${allTools.length} available tools (${duration}ms)`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Prompt generated successfully`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session.id,
      promptLength: finalPrompt!.length,
      allToolsCount: allTools.length,
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
