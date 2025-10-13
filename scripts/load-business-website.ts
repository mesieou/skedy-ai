/**
 * Script to load a business website into the knowledge base
 * Usage: tsx scripts/load-business-website.ts
 *
 * Example from client.py converted to TypeScript
 */

import { KnowledgeBaseManager } from '../features/knowledge-base';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  // Check if required environment variables are set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please add it to .env.local');
    process.exit(1);
  }

  if (!process.env.MCP_SERVER_URL) {
    console.error('⚠️  MCP_SERVER_URL not set, using default: http://localhost:8000/mcp');
  }

  // Example usage - similar to Python client.py
  const manager = KnowledgeBaseManager.fromEnv(process.env.DATABASE_URL);

  const result = await manager.loadWebsite({
    websiteUrl: "https://tigapropertyservices.com.au/",
    databaseUrl: process.env.DATABASE_URL,
    businessId: "48576899-068b-4d61-b131-9ab4e599bdea", // Optional
    tableName: "tiga_website_data", // Optional - will auto-generate if not provided
    maxTokens: 8191 // Optional - defaults to 8191
  });

  console.log('\n📊 Final Result:');
  console.log('Success:', result.success);
  console.log('Duration:', `${result.duration / 1000}s`);
  console.log('Table Name:', result.tableName);
  if (result.error) {
    console.log('Error:', result.error);
  }
  console.log('Content:', result.content);
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { main };
