import { BaseRepository } from '../base-repository';
import type { BusinessTool } from '../types/business-tools';
import type { OpenAIFunctionSchema, Tool } from '../types/tools';
import { sentry } from '../../../utils/sentryService';

export class BusinessToolsRepository extends BaseRepository<BusinessTool> {
  constructor() {
    super('business_tools');
  }

  /**
   * Get active tool schemas for a business in ONE query using JOIN
   */
  async getActiveToolSchemasForBusiness(businessId: string): Promise<OpenAIFunctionSchema[]> {
    const startTime = Date.now();

    try {
      sentry.addBreadcrumb('Getting active tool schemas for business', 'business-tools', {
        businessId,
        operation: 'getActiveToolSchemasForBusiness'
      });

      const client = await this.getClient();
      const { data, error } = await client
        .from('business_tools')
        .select('tools(function_schema)')
        .eq('business_id', businessId)
        .eq('active', true);

      if (error) {
        throw new Error(`Failed to get tool schemas: ${error.message}`);
      }

      const schemas = (data || [])
        .map((row: { tools: { function_schema: OpenAIFunctionSchema }[] }) => row.tools?.[0]?.function_schema)
        .filter(Boolean);

      sentry.addBreadcrumb('Tool schemas retrieved successfully', 'business-tools', {
        businessId,
        schemasCount: schemas.length,
        duration: Date.now() - startTime
      });

      return schemas;

    } catch (error) {
      sentry.trackError(error as Error, {
        sessionId: 'business-tools-query',
        operation: 'getActiveToolSchemasForBusiness',
        metadata: {
          businessId,
          duration: Date.now() - startTime
        }
      });
      throw error;
    }
  }

  /**
   * Get active tool names for a business in ONE query using JOIN
   * Optimized for prompt generation - returns just the tool names
   */
  async getActiveToolNamesForBusiness(businessId: string): Promise<string[]> {
    const startTime = Date.now();

    try {
      sentry.addBreadcrumb('Getting active tool names for business', 'business-tools', {
        businessId,
        operation: 'getActiveToolNamesForBusiness'
      });

      console.log(`🔍 [BusinessTools] About to get database client...`);
      console.log(`🔍 [BusinessTools] Business ID: ${businessId}`)
    ;
      const client = await this.getClient();
      console.log(`🔍 [BusinessTools] Got client successfully, about to execute query...`);

      // Simplified query without JOIN to avoid hanging
      console.log(`🔍 [BusinessTools] Using simplified query approach...`);

      const { data: businessToolsData, error: businessToolsError } = await Promise.race([
        client
          .from('business_tools')
          .select('tool_id')
          .eq('business_id', businessId)
          .eq('active', true),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Business tools query timeout after 10 seconds')), 10000)
        )
      ]);

      console.log(`🔍 [BusinessTools] Business tools query completed:`, { businessToolsData, businessToolsError });

      if (businessToolsError) {
        throw new Error(`Failed to get business tools: ${businessToolsError.message}`);
      }

      if (!businessToolsData || businessToolsData.length === 0) {
        console.log(`🔍 [BusinessTools] No active tools found for business ${businessId}`);
        return [];
      }

      // Get tool names separately
      const toolIds = businessToolsData.map((row: { tool_id: string }) => row.tool_id);
      console.log(`🔍 [BusinessTools] Found tool IDs:`, toolIds);

      const { data: toolsData, error: toolsError } = await Promise.race([
        client
          .from('tools')
          .select('name')
          .in('id', toolIds),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tools query timeout after 10 seconds')), 10000)
        )
      ]);

      console.log(`🔍 [BusinessTools] Tools query completed:`, { toolsData, toolsError });

      if (toolsError) {
        throw new Error(`Failed to get tool names: ${toolsError.message}`);
      }

      const toolNames = (toolsData || []).map((row: { name: string }) => row.name).filter(Boolean);

      sentry.addBreadcrumb('Active tool names retrieved successfully', 'business-tools', {
        businessId,
        toolCount: toolNames.length,
        duration: Date.now() - startTime
      });

      return toolNames;

    } catch (error) {
      sentry.trackError(error as Error, {
        sessionId: 'business-tools-query',
        operation: 'getActiveToolNamesForBusiness',
        metadata: {
          businessId,
          duration: Date.now() - startTime
        }
      });
      throw error;
    }
  }

  /**
   * Get active tools by names for a business in ONE query using JOIN
   * Used by updateToolsToSession to get full tool objects
   */
  async getActiveToolsByNamesForBusiness(businessId: string, toolNames: string[]): Promise<Tool[]> {
    const startTime = Date.now();

    try {
      sentry.addBreadcrumb('Getting active tools by names for business', 'business-tools', {
        businessId,
        toolNamesCount: toolNames.length,
        operation: 'getActiveToolsByNamesForBusiness'
      });

      const client = await this.getClient();
      const { data, error } = await client
        .from('business_tools')
        .select('tools(*)')
        .eq('business_id', businessId)
        .eq('active', true)
        .in('tools.name', toolNames);

      if (error) {
        throw new Error(`Failed to get active tools by names: ${error.message}`);
      }

      const tools = (data as unknown as { tools: Tool }[] || [])
        .map((row) => row.tools)
        .filter((tool): tool is Tool => Boolean(tool));

      sentry.addBreadcrumb('Active tools retrieved successfully', 'business-tools', {
        businessId,
        toolsFound: tools.length,
        duration: Date.now() - startTime
      });

      return tools;

    } catch (error) {
      sentry.trackError(error as Error, {
        sessionId: 'business-tools-query',
        operation: 'getActiveToolsByNamesForBusiness',
        metadata: {
          businessId,
          toolNamesRequested: toolNames.length,
          duration: Date.now() - startTime
        }
      });
      throw error;
    }
  }
}
