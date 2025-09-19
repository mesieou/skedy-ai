import { ToolsRepository } from '../../../shared/lib/database/repositories/tools-repository';
import { BusinessPromptRepository } from '../../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../../shared/lib/database/repositories/business-repository';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Tool } from '../../../shared/lib/database/types/tools';
import type { Session } from '../../sessions/session';

export interface GeneratedPromptAndTools {
  prompt: string;
  tools: Tool[];
}

/**
 * Generate complete prompt with business tools and information injected
 * Returns both the prompt and the tool schemas for OpenAI
 */
export async function generatePromptAndTools(business: Business, session?: Session): Promise<GeneratedPromptAndTools> {
  const toolRepo = new ToolsRepository();
  const businessPromptRepo = new BusinessPromptRepository();
  const businessRepo = new BusinessRepository();

  // Get active tools for business
  const tools = await toolRepo.findAll({}, {
    business_id: business.id,
    is_active: true
  });
  const toolsList = tools.length > 0 ? tools.map((t: Tool) => t.name).join(', ') : 'No tools configured';

  // Get business info string
  const businessInfoString = businessRepo.buildBusinessInfoForCustomers(business);

  // Get active prompt content for business in ONE query using JOIN
  const promptContent = await businessPromptRepo.getActivePromptContentForBusiness(business.id);

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

  return {
    prompt: finalPrompt!,
    tools: tools
  };
}
