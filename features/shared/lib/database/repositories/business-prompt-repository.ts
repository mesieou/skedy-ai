import { BaseRepository } from '../base-repository';
import type { BusinessPrompt } from '../types/business-prompt';

export class BusinessPromptRepository extends BaseRepository<BusinessPrompt> {
  constructor() {
    super('business_prompts');
  }

  /**
   * Get active prompt content for a business in ONE query using JOIN
   */
  async getActivePromptContentForBusiness(businessId: string): Promise<string | null> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('business_prompts')
      .select('prompts(prompt_content)')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    if (error) throw new Error(`Failed to get prompt content: ${error.message}`);
    return data?.prompts?.[0]?.prompt_content || null;
  }
}
