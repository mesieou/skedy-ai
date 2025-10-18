import { LoadWebsiteParams, LoadWebsiteResult, KnowledgeBaseConfig, QueryKnowledgeParams, QueryKnowledgeResult } from './types/knowledge-base';

// MCP imports - will need to install: npm install @modelcontextprotocol/sdk
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * KnowledgeBaseManager - Manages loading and interacting with business knowledge bases via MCP server
 * Similar pattern to AvailabilityManager but for knowledge base operations
 */
export class KnowledgeBaseManager {
  private config: KnowledgeBaseConfig;

  constructor(config: KnowledgeBaseConfig) {
    this.config = config;
  }

  /**
   * Load a website into the knowledge base
   * Follows the same pattern as client.py's load_website_to_knowledge_base
   */
  async loadWebsite(params: LoadWebsiteParams): Promise<LoadWebsiteResult> {
    const startTime = Date.now();

    // Generate table name if not provided
    const tableName = params.tableName || `website_${Math.floor(Date.now() / 1000)}`;

    console.log(`🚀 Loading website: ${params.websiteUrl}`);
    console.log(`📊 Database: ${params.databaseUrl.substring(0, 50)}...`);
    console.log(`📋 Table: ${tableName}`);
    if (params.businessId) {
      console.log(`🏢 Business ID: ${params.businessId}`);
    }

    try {
      // Create transport for streamable HTTP connection
      const transport = new StreamableHTTPClientTransport(
        new URL(this.config.mcpServerUrl)
      );

      // Create MCP client
      const client = new Client({
        name: 'skedy-ai-knowledge-base-client',
        version: '1.0.0',
      }, {
        capabilities: {}
      });

      // Connect to MCP server
      console.log('🔗 Initializing connection...');
      const initStart = Date.now();
      await client.connect(transport);
      const initTime = Date.now() - initStart;
      console.log(`✅ Connected in ${initTime}ms`);

      // Prepare tool arguments (same as Python client)
      const toolArgs: Record<string, unknown> = {
        sources: [params.websiteUrl],
        table_name: tableName,
        max_tokens: params.maxTokens || 8191,
        database_url: params.databaseUrl
      };

      // Add business_id if provided (optional)
      if (params.businessId) {
        toolArgs.business_id = params.businessId;
      }

      // Call the load_documents_tool
      console.log('🚀 Loading documents...');
      const result = await this.timedToolCall(client, 'load_documents_tool', toolArgs);

      const totalDuration = Date.now() - startTime;
      console.log(`⏱️  Total completed in ${totalDuration / 1000}s`);
      console.log(`📝 Result:`, result.content);

      // Close connection
      await client.close();

      return {
        success: true,
        content: result.content,
        duration: totalDuration,
        tableName
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`❌ Failed after ${totalDuration / 1000}s:`, error);

      return {
        success: false,
        content: null,
        duration: totalDuration,
        tableName,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Call a tool with timing and progress updates
   * Replicates the Python timed_tool_call function
   */
  private async timedToolCall(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    toolName: string,
    arguments_: Record<string, unknown>
  ): Promise<{ content: unknown; duration: number }> {
    const startTime = Date.now();

    try {
      // Show what we're processing
      if (arguments_.sources && Array.isArray(arguments_.sources)) {
        const sources = arguments_.sources as string[];
        if (sources.length === 1) {
          console.log(`📄 Processing: ${sources[0]}`);
        } else {
          console.log(`📄 Processing ${sources.length} sources...`);
        }
      }

      console.log(`⏳ Executing ${toolName}...`);

      // Create promise for the tool call
      const toolCallPromise = client.callTool({
        name: toolName,
        arguments: arguments_
      });

      // Add periodic progress updates (every 15 seconds)
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`⏳ Processing... ${elapsed.toFixed(0)}s elapsed`);
      }, 15000);

      // Wait for result with timeout (300 seconds = 5 minutes)
      const result = await this.withTimeout(toolCallPromise, 300000) as { content: unknown };

      clearInterval(progressInterval);

      const duration = Date.now() - startTime;
      console.log(`✅ Completed in ${duration / 1000}s`);

      return {
        content: result.content || result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error && error.message === 'Timeout') {
        console.log(`⏰ Timed out after ${duration / 1000}s`);
      } else {
        console.log(`❌ Failed after ${duration / 1000}s:`, error);
      }

      throw error;
    }
  }

  /**
   * Helper to add timeout to promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Query the knowledge base using vector similarity search
   *
   * Returns relevant source documents for the agent to synthesize into an answer.
   * The Realtime API agent will naturally incorporate these sources into the conversation.
   * Uses MCP server's query_knowledge_tool
   */
  async queryKnowledge(params: QueryKnowledgeParams): Promise<QueryKnowledgeResult> {
    const startTime = Date.now();

    console.log(`🔍 Querying knowledge base: "${params.question}"`);
    console.log(`📊 Database: ${params.databaseUrl.substring(0, 50)}...`);
    console.log(`📋 Table: ${params.tableName}`);
    console.log(`🏢 Business ID: ${params.businessId}`);

    try {
      // Create transport for streamable HTTP connection
      const transport = new StreamableHTTPClientTransport(
        new URL(this.config.mcpServerUrl)
      );

      // Create MCP client
      const client = new Client({
        name: 'skedy-ai-knowledge-query-client',
        version: '1.0.0',
      }, {
        capabilities: {}
      });

      // Connect to MCP server
      console.log('🔗 Connecting to MCP server...');
      await client.connect(transport);
      console.log(`✅ Connected`);

      // Prepare query arguments
      const toolArgs: Record<string, unknown> = {
        question: params.question,
        table_name: params.tableName,
        database_url: params.databaseUrl,
        business_id: params.businessId,
        match_threshold: params.matchThreshold || 0.7,
        match_count: params.matchCount || 3
      };

      // Call the query_knowledge_tool
      console.log('🔍 Searching knowledge base...');
      const result = await this.timedToolCall(client, 'query_knowledge_tool', toolArgs);

      const totalDuration = Date.now() - startTime;
      console.log(`⏱️  Query completed in ${totalDuration / 1000}s`);

      // Close connection
      await client.close();

      // Parse MCP response
      const response = result.content as {
        sources: Array<{ text: string; similarity: number; metadata?: Record<string, unknown> }>;
        context_count: number;
      };

      return {
        success: true,
        sources: response.sources || [],
        duration: totalDuration
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`❌ Query failed after ${totalDuration / 1000}s:`, error);

      return {
        success: false,
        sources: [],
        duration: totalDuration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Static helper to create a manager with environment config
   */
  static fromEnv(databaseUrl?: string): KnowledgeBaseManager {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:8000/mcp';
    const dbUrl = databaseUrl || process.env.DATABASE_URL || '';

    return new KnowledgeBaseManager({
      mcpServerUrl,
      databaseUrl: dbUrl
    });
  }
}
