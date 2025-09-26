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

    // Add timeout protection to prevent webhook hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`getActiveToolNamesForBusiness timed out after 10 seconds for business ${businessId}`));
      }, 10000); // 10 second timeout
    });

    try {
      console.log(`🔧 [BusinessTools] STEP 1: Starting getActiveToolNamesForBusiness for ${businessId}`);

      sentry.addBreadcrumb('Getting active tool names for business', 'business-tools', {
        businessId,
        operation: 'getActiveToolNamesForBusiness'
      });

      console.log(`🔧 [BusinessTools] STEP 2: About to call this.getClient()`);
      const client = await Promise.race([this.getClient(), timeoutPromise]);
      console.log(`🔧 [BusinessTools] STEP 3: Got client successfully`);

      console.log(`🔧 [BusinessTools] STEP 4: About to execute Supabase query`);
      const queryPromise = client
        .from('business_tools')
        .select('tools(name)')
        .eq('business_id', businessId)
        .eq('active', true);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log(`🔧 [BusinessTools] STEP 5: Query completed`);
      console.log(`🔍 [BusinessTools] Query result for business ${businessId}:`, { data, error });

      if (error) {
        console.log(`🔧 [BusinessTools] STEP 6: Query had error: ${error.message}`);
        throw new Error(`Failed to get active tool names: ${error.message}`);
      }

      console.log(`🔧 [BusinessTools] STEP 7: Processing results`);
      const toolNames = (data as unknown as { tools: { name: string } }[] || [])
        .map((row) => row.tools?.name)
        .filter((name): name is string => Boolean(name));

      console.log(`🔧 [BusinessTools] STEP 8: Processed ${toolNames.length} tool names: ${toolNames.join(', ')}`);

      sentry.addBreadcrumb('Active tool names retrieved successfully', 'business-tools', {
        businessId,
        toolCount: toolNames.length,
        duration: Date.now() - startTime
      });

      console.log(`🔧 [BusinessTools] STEP 9: Returning tool names`);
      return toolNames;

    } catch (error) {
      console.log(`🔧 [BusinessTools] STEP ERROR: Caught error:`, error);
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
