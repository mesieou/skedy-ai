# Knowledge Base Manager

Manages loading and interacting with business knowledge bases via MCP (Model Context Protocol) server.

## Overview

This module provides a TypeScript client for the MCP knowledge base server, following the same pattern as the Python `client.py`. It allows you to:
- Load business websites into a knowledge base
- Future: Modify knowledge base, delete documents, etc.

## Structure

```
features/knowledge-base/
├── lib/
│   ├── knowledge-base-manager.ts    # Main manager class
│   └── types/
│       └── knowledge-base.ts        # TypeScript types
├── index.ts                         # Public exports
└── README.md                        # This file
```

## Installation

1. Install the required MCP SDK:
```bash
npm install @modelcontextprotocol/sdk
```

2. Set environment variables:
```bash
# .env.local or your environment
MCP_SERVER_URL=http://45.151.154.42:8000/mcp
DATABASE_URL=postgresql://...
```

## Usage

### As a Script

Run the example script to load a website:

```bash
npm run load-website
```

Or directly:
```bash
tsx scripts/load-business-website.ts
```

### In Code

```typescript
import { KnowledgeBaseManager } from '@/features/knowledge-base';

// Option 1: Use environment variables
const manager = KnowledgeBaseManager.fromEnv();

// Option 2: Configure manually
const manager = new KnowledgeBaseManager({
  mcpServerUrl: 'http://45.151.154.42:8000/mcp',
  databaseUrl: process.env.DATABASE_URL!
});

// Load a website into the knowledge base
const result = await manager.loadWebsite({
  websiteUrl: "https://example.com/",
  databaseUrl: process.env.DATABASE_URL!,
  businessId: "uuid-here", // Optional
  tableName: "custom_table_name", // Optional - auto-generates if not provided
  maxTokens: 8191 // Optional - defaults to 8191
});

console.log('Success:', result.success);
console.log('Duration:', `${result.duration / 1000}s`);
console.log('Table Name:', result.tableName);
```

### In Agent Tools

Can be used from AI agent tools (similar to how AvailabilityManager is used):

```typescript
import { KnowledgeBaseManager } from '@/features/knowledge-base';

export async function loadBusinessKnowledgeTool(businessId: string, websiteUrl: string) {
  const manager = KnowledgeBaseManager.fromEnv();

  const result = await manager.loadWebsite({
    websiteUrl,
    databaseUrl: process.env.DATABASE_URL!,
    businessId,
    tableName: `business_kb_${businessId}`
  });

  return result;
}
```

### In Dashboard

Can be called from business dashboard to refresh knowledge:

```typescript
// app/api/knowledge-base/load-website/route.ts
import { KnowledgeBaseManager } from '@/features/knowledge-base';

export async function POST(request: Request) {
  const { websiteUrl, businessId } = await request.json();

  const manager = KnowledgeBaseManager.fromEnv();
  const result = await manager.loadWebsite({
    websiteUrl,
    databaseUrl: process.env.DATABASE_URL!,
    businessId
  });

  return Response.json(result);
}
```

## API Reference

### `KnowledgeBaseManager`

Main class for managing knowledge base operations.

#### Constructor

```typescript
new KnowledgeBaseManager(config: KnowledgeBaseConfig)
```

#### Static Methods

- `KnowledgeBaseManager.fromEnv(databaseUrl?: string)` - Create manager from environment variables

#### Instance Methods

- `loadWebsite(params: LoadWebsiteParams): Promise<LoadWebsiteResult>` - Load a website into the knowledge base

### Types

```typescript
interface LoadWebsiteParams {
  websiteUrl: string;
  databaseUrl: string;
  businessId?: string;      // Optional - business identifier
  tableName?: string;       // Optional - auto-generated if not provided
  maxTokens?: number;       // Optional - defaults to 8191
}

interface LoadWebsiteResult {
  success: boolean;
  content: any;
  duration: number;         // Duration in milliseconds
  tableName: string;        // Table name used (generated or provided)
  error?: string;           // Error message if failed
}
```

## Progress Updates

The manager automatically logs progress updates:
- Every 15 seconds during processing
- Connection status
- Processing status
- Completion time

```
🚀 Loading website: https://example.com/
📊 Database: postgresql://...
📋 Table: website_1234567890
🏢 Business ID: uuid-here
🔗 Initializing connection...
✅ Connected in 123ms
🚀 Loading documents...
📄 Processing: https://example.com/
⏳ Executing load_documents_tool...
⏳ Processing... 15s elapsed
⏳ Processing... 30s elapsed
✅ Completed in 45.2s
⏱️  Total completed in 45.5s
```

## Timeout

Default timeout is **300 seconds (5 minutes)** per tool call, matching the Python client behavior.

## Error Handling

The manager catches and returns errors gracefully:

```typescript
const result = await manager.loadWebsite({ ... });

if (!result.success) {
  console.error('Failed to load website:', result.error);
  console.log('Duration:', result.duration);
}
```

## Future Enhancements

Planned features:
- `updateKnowledgeBase()` - Modify existing knowledge
- `deleteDocument()` - Remove specific documents
- `queryKnowledge()` - Query the knowledge base
- `listDocuments()` - List all documents for a business

## Notes

- Business ID is optional - useful for multi-tenant setups
- Table names auto-generate as `website_<timestamp>` if not provided
- Uses the same streamable HTTP transport as the Python client
- Follows the AvailabilityManager pattern for consistency
