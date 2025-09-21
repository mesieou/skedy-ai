import { BaseRepository } from '../base-repository';
import type { BusinessTool } from '../types/business-tools';
import type { OpenAIFunctionSchema } from '../types/tools';

export class BusinessToolsRepository extends BaseRepository<BusinessTool> {
  constructor() {
    super('business_tools');
  }

  /**
   * Get active tool schemas for a business in ONE query using JOIN
   */
  async getActiveToolSchemasForBusiness(businessId: string): Promise<OpenAIFunctionSchema[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('business_tools')
      .select('tools(function_schema)')
      .eq('business_id', businessId)
      .eq('active', true);

    if (error) throw new Error(`Failed to get tool schemas: ${error.message}`);
    return (data || [])
      .map((row: { tools: { function_schema: OpenAIFunctionSchema }[] }) => row.tools?.[0]?.function_schema)
      .filter(Boolean);
  }

  /**
   * Get active tool names for a business in ONE query using JOIN
   * Optimized for prompt generation - returns just the tool names
   */
  async getActiveToolNamesForBusiness(businessId: string): Promise<string[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('business_tools')
      .select('tools(name)')
      .eq('business_id', businessId)
      .eq('active', true);

    if (error) throw new Error(`Failed to get active tool names: ${error.message}`);
    return (data || [])
      .map((row: { tools: { name: string }[] }) => row.tools?.[0]?.name)
      .filter(Boolean);
  }
}
