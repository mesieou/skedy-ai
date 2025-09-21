import { ToolsRepository } from '../../shared/lib/database/repositories/tools-repository';
import { BusinessPromptRepository } from '../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../shared/lib/database/repositories/business-repository';
import { sentry } from '../../shared/utils/sentryService';
import { getStageTools } from '../../shared/lib/database/types/tools';
import type { Session } from '../sessions/session';
import assert from 'assert';

/**
 * Generate complete prompt with business tools and information injected
 * Stores everything in the session - no return needed
 */
export async function generatePromptAndTools(session: Session): Promise<void> {
  const startTime = Date.now();

  try {
    const business = session.businessEntity;
    console.log(`🤖 [GeneratePrompt] Generating prompt and tools for business: ${business.name} (${business.id})`);

    // Add breadcrumb
    sentry.addBreadcrumb(`Generating prompt and tools`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session.id
    });

    const toolRepo = new ToolsRepository();
    const businessPromptRepo = new BusinessPromptRepository();
    const businessRepo = new BusinessRepository();

    // Get ALL active tools for this business (for prompt and session reference)
    const allTools = await toolRepo.findAll({}, {
      business_id: business.id,
      is_active: true
    });

    // Get stage-specific tool names
    const stageToolNames = getStageTools(session.currentStage);

    // Filter to get only tools needed for current stage
    const stageTools = allTools.filter(tool => stageToolNames.includes(tool.name));

    const allToolsList = allTools.length > 0 ? allTools.map(t => t.name).join(', ') : 'No tools configured';
    const stageToolsList = stageTools.length > 0 ? stageTools.map(t => t.name).join(', ') : 'No stage tools';

    console.log(`🔧 [GeneratePrompt] Found ${allTools.length} total tools: ${allToolsList}`);
    console.log(`🎯 [GeneratePrompt] Stage '${session.currentStage}' tools: ${stageToolsList}`);

    // Get business info string
    const businessInfoString = businessRepo.buildBusinessInfoForCustomers(business);

    // Get active prompt content for business in ONE query using JOIN
    const promptContent = await businessPromptRepo.getActivePromptContentForBusiness(business.id);

    assert(promptContent, `No active prompt found for business ${business.id}`);

    // Inject data into prompt using replacements map
    const replacements = {
      '{LIST OF TOOLS}': allToolsList,
      '{BUSINESS INFO}': businessInfoString,
    };

    const finalPrompt = Object.entries(replacements).reduce(
      (prompt, [placeholder, value]) => prompt!.replace(new RegExp(placeholder, 'g'), value),
      promptContent
    );

    // Store tools and prompt in session
    session.aiInstructions = finalPrompt!;
    session.allAvailableToolNames = allTools.map(t => t.name); // All tool names for reference
    session.availableToolsForStage = stageTools; // Only current stage tools

    const duration = Date.now() - startTime;
    console.log(`✅ [GeneratePrompt] Generated prompt (${finalPrompt!.length} chars) and ${stageTools.length} stage tools (${duration}ms)`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Prompt and tools generated successfully`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session.id,
      promptLength: finalPrompt!.length,
      toolsCount: stageTools.length,
      duration
    });

    // All data stored in session - no return needed

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [GeneratePrompt] Failed to generate prompt and tools for business ${session.businessEntity.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessEntity.id,
      operation: 'generate_prompt_and_tools',
      metadata: {
        duration,
        businessName: session.businessEntity.name
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
