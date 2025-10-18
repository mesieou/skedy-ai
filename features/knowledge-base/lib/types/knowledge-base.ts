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
}

export interface KnowledgeBaseConfig {
  mcpServerUrl: string;
  databaseUrl: string;
}

export interface ToolCallResult {
  content: unknown;
  duration: number;
}

export interface QueryKnowledgeParams {
  question: string;
  databaseUrl: string;
  businessId: string;
  tableName: string;      // Table where knowledge is stored (e.g., 'documents' or business-specific)
  matchThreshold?: number; // Vector similarity threshold (0-1, default 0.7)
  matchCount?: number;     // Max results to return (default 3)
}

export interface QueryKnowledgeResult {
  success: boolean;
  sources: Array<{         // Source documents from vector search
    text: string;
    similarity: number;
    metadata?: Record<string, unknown>;
  }>;
  duration: number;
  error?: string;
}
