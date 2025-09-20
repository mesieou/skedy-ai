import { ToolsRepository } from '../../shared/lib/database/repositories/tools-repository';
import { BusinessPromptRepository } from '../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../shared/lib/database/repositories/business-repository';
import { sentry } from '../../shared/utils/sentryService';
import type { Business } from '../../shared/lib/database/types/business';
import type { Tool } from '../../shared/lib/database/types/tools';
import type { Session } from '../sessions/session';

export interface GeneratedPromptAndTools {
  prompt: string;
  tools: Tool[];
}

/**
 * Generate complete prompt with business tools and information injected
 * Returns both the prompt and the tool schemas for OpenAI
 */
export async function generatePromptAndTools(business: Business, session?: Session): Promise<GeneratedPromptAndTools> {
  const startTime = Date.now();

  try {
    console.log(`🤖 [GeneratePrompt] Generating prompt and tools for business: ${business.name} (${business.id})`);

    // Add breadcrumb
    sentry.addBreadcrumb(`Generating prompt and tools`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session?.id
    });

    const toolRepo = new ToolsRepository();
    const businessPromptRepo = new BusinessPromptRepository();
    const businessRepo = new BusinessRepository();

    // Get active tools for business
    const tools = await toolRepo.findAll({}, {
      business_id: business.id,
      is_active: true
    });
    const toolsList = tools.length > 0 ? tools.map((t: Tool) => t.name).join(', ') : 'No tools configured';

    console.log(`🔧 [GeneratePrompt] Found ${tools.length} active tools: ${toolsList}`);

    // Get business info string
    const businessInfoString = businessRepo.buildBusinessInfoForCustomers(business);

    // Get active prompt content for business in ONE query using JOIN
    const promptContent = await businessPromptRepo.getActivePromptContentForBusiness(business.id);

    if (!promptContent) {
      throw new Error(`No active prompt found for business ${business.id}`);
    }

    // Inject data into prompt using replacements map
    const replacements = {
      '{LIST OF TOOLS}': toolsList,
      '{BUSINESS INFO}': businessInfoString,
    };

    const finalPrompt = Object.entries(replacements).reduce(
      (prompt, [placeholder, value]) => prompt!.replace(new RegExp(placeholder, 'g'), value),
      promptContent
    );

    // Set initial active tools in session if provided
    if (session) {
      session.aiInstructions = finalPrompt!;
      session.availableTools = tools; // Store actual Tool objects from database
      session.activeTools = ['get_service_details', 'request_tool'];
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [GeneratePrompt] Generated prompt (${finalPrompt!.length} chars) and ${tools.length} tools (${duration}ms)`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Prompt and tools generated successfully`, 'prompt-generation', {
      businessId: business.id,
      sessionId: session?.id,
      promptLength: finalPrompt!.length,
      toolsCount: tools.length,
      duration
    });

    return {
      prompt: finalPrompt!,
      tools: tools
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [GeneratePrompt] Failed to generate prompt and tools for business ${business.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session?.id || 'unknown',
      businessId: business.id,
      operation: 'generate_prompt_and_tools',
      metadata: {
        duration,
        businessName: business.name
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
