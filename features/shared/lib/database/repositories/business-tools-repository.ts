import { BaseRepository } from '../base-repository';
import type { BusinessTool } from '../types/business-tools';

export class BusinessToolsRepository extends BaseRepository<BusinessTool> {
  constructor() {
    super('business_tools');
  }

  /**
   * Get active tool names for a business in ONE query using JOIN
   */
  async getActiveToolNamesForBusiness(businessId: string): Promise<string[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('business_tools')
      .select('tools(name)')
      .eq('business_id', businessId)
      .eq('active', true);

    if (error) throw new Error(`Failed to get tool names: ${error.message}`);
    return (data || [])
      .map((row: { tools: { name: string }[] }) => {
        // Supabase foreign key relations return arrays
        return row.tools?.[0]?.name;
      })
      .filter((name): name is string => Boolean(name));
  }
}
