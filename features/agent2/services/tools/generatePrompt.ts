import { BusinessToolsRepository } from '../../../shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '../../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../../shared/lib/database/repositories/business-repository';
import type { Business } from '../../../shared/lib/database/types/business';

/**
 * Generate complete prompt with business tools and information injected
 */
export async function generatePrompt(business: Business): Promise<string> {
  const businessToolsRepo = new BusinessToolsRepository();
  const businessPromptRepo = new BusinessPromptRepository();
  const businessRepo = new BusinessRepository();

  // Get active tool names for business in ONE query using JOIN
  const toolNames = await businessToolsRepo.getActiveToolNamesForBusiness(business.id);
  const toolsList = toolNames.length > 0 ? toolNames.join(', ') : 'No tools configured';

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

  return finalPrompt!;
}
