export interface LoadWebsiteParams {
  websiteUrl: string;
  databaseUrl: string;
  businessId?: string;
  tableName?: string;
  maxTokens?: number;
}

export interface LoadWebsiteResult {
  success: boolean;
  content: unknown;
  duration: number;
  tableName: string;
  error?: string;
  partialScrape?: boolean;
}

export interface KnowledgeBaseConfig {
  mcpServerUrl: string;
  databaseUrl: string;
}

export interface ToolCallResult {
  content: unknown;
  duration: number;
}
