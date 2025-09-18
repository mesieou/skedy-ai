import { BusinessToolsRepository } from '../../../shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '../../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../../shared/lib/database/repositories/business-repository';
import type { Business } from '../../../shared/lib/database/types/business';
import type { OpenAIFunctionSchema } from '../../../shared/lib/database/types/tools';

export interface GeneratedPromptAndTools {
  prompt: string;
  tools: OpenAIFunctionSchema[];
}

/**
 * Generate complete prompt with business tools and information injected
 * Returns both the prompt and the tool schemas for OpenAI
 */
export async function generatePromptAndTools(business: Business): Promise<GeneratedPromptAndTools> {
  const businessToolsRepo = new BusinessToolsRepository();
  const businessPromptRepo = new BusinessPromptRepository();
  const businessRepo = new BusinessRepository();

  // Get active tool schemas for business in ONE query using JOIN
  const tools = await businessToolsRepo.getActiveToolSchemasForBusiness(business.id);
  const toolsList = tools.length > 0 ? tools.map(t => t.function.name).join(', ') : 'No tools configured';

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

  return {
    prompt: finalPrompt!,
    tools: tools
  };
}
