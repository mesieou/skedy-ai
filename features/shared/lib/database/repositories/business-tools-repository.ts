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

      const client = await this.getClient();

      const { data, error } = await client
        .from('business_tools')
        .select('tools(name)')
        .eq('business_id', businessId)
        .eq('active', true);

      console.log(`🔍 [BusinessTools] Query result for business ${businessId}:`, { data, error });

      if (error) {
        throw new Error(`Failed to get active tool names: ${error.message}`);
      }

      const toolNames = (data as unknown as { tools: { name: string } }[] || [])
        .map((row) => row.tools?.name)
        .filter((name): name is string => Boolean(name));

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

  /**
   * Generate dynamic schema for request_tool with business-specific enum
   *
   * The request_tool allows AI to request additional tools during conversation.
   * The tool_name enum must be customized per business to only show their available tools.
   */
  async generateRequestToolSchema(businessId: string): Promise<OpenAIFunctionSchema> {
    // Get all active tool names for this business
    const allTools = await this.getActiveToolNamesForBusiness(businessId);

    // Remove request_tool itself from the enum (can't request itself)
    const requestableTools = allTools.filter(name => name !== 'request_tool');

    // Sort alphabetically for consistency
    requestableTools.sort();

    console.log(`🔧 [RequestTool] Generating schema for business ${businessId} with ${requestableTools.length} requestable tools`);

    return {
      type: 'function',
      name: 'request_tool',
      description: 'Request tool access for conversation flow changes',
      parameters: {
        type: 'object',
        strict: true,
        properties: {
          tool_name: {
            type: 'string',
            description: 'Tool needed',
            enum: requestableTools  // Dynamic! Customized per business
          },
          service_name: {
            type: 'string',
            description: 'Service name (required when requesting get_quote tool)'
          },
          reason: {
            type: 'string',
            description: 'Why needed'
          }
        },
        required: ['tool_name'],
        additionalProperties: false
      }
    };
  }

  /**
   * Update request_tool dynamic schema for a business
   *
   * Call this after adding/removing tools for a business to regenerate
   * the request_tool enum with current available tools
   */
  async updateRequestToolDynamicSchema(
    businessId: string,
    requestToolId: string
  ): Promise<void> {
    // Find the business_tools record for request_tool
    const businessTool = await this.findOne({
      business_id: businessId,
      tool_id: requestToolId
    });

    if (!businessTool) {
      console.warn(`⚠️ [RequestTool] request_tool not found for business ${businessId}`);
      return;
    }

    // Generate new dynamic schema
    const dynamicSchema = await this.generateRequestToolSchema(businessId);

    // Update business_tools with dynamic schema
    await this.updateOne(
      { id: businessTool.id },
      { dynamic_schema: dynamicSchema }
    );

    console.log(`✅ [RequestTool] Updated request_tool schema for business ${businessId}`);
    console.log(`   Available tools: ${dynamicSchema.parameters.properties.tool_name.enum?.join(', ')}`);
  }
}
