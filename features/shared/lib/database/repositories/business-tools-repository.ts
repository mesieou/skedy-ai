import { BaseRepository } from '../base-repository';
import type { BusinessTool } from '../types/business-tools';
import type { OpenAIFunctionSchema, Tool } from '../types/tools';

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
    console.log(`🤖 [BusinessToolsRepository] Getting active tool names for business: ${businessId}`);
    const client = await this.getClient();
    console.log(`🤖 [BusinessToolsRepository] Client info:`, {
      hasClient: !!client,
      clientType: typeof client,
      hasFrom: typeof client?.from
    });

    console.log(`🤖 [BusinessToolsRepository] Starting database query...`);
    const { data, error } = await client
      .from('business_tools')
      .select('tools(name)')
      .eq('business_id', businessId)
      .eq('active', true);
    console.log(`🤖 [BusinessToolsRepository] Query completed. Data:`, data, 'Error:', error);
    if (error) throw new Error(`Failed to get active tool names: ${error.message}`);
    // Supabase foreign key syntax returns: [{"tools": {"name": "tool_name"}}, ...]
    return (data as unknown as { tools: { name: string } }[] || [])
      .map((row) => row.tools?.name)
      .filter((name): name is string => Boolean(name));
  }

  /**
   * Get active tools by names for a business in ONE query using JOIN
   * Used by updateToolsToSession to get full tool objects
   */
  async getActiveToolsByNamesForBusiness(businessId: string, toolNames: string[]): Promise<Tool[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('business_tools')
      .select('tools(*)')
      .eq('business_id', businessId)
      .eq('active', true)
      .in('tools.name', toolNames);

    if (error) throw new Error(`Failed to get active tools by names: ${error.message}`);
    // Supabase foreign key syntax returns: [{"tools": Tool}, ...]
    return (data as unknown as { tools: Tool }[] || [])
      .map((row) => row.tools)
      .filter((tool): tool is Tool => Boolean(tool));
  }
}
