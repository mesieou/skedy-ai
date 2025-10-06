#!/usr/bin/env tsx

/**
 * Setup Single Tool Script
 *
 * Creates or updates a single tool by name in the database.
 * Useful for development and testing individual tools.
 *
 * Usage:
 *   npm run setup-tool <tool_name>
 *
 * Examples:
 *   npm run setup-tool send_sms_booking_confirmation
 *   npm run setup-tool get_quote
 *   npm run setup-tool create_booking
 *
 * The script will:
 * 1. Find the tool definition in tools-data.ts
 * 2. Check if it already exists in the database
 * 3. Update if exists, create if new
 * 4. Show success/error messages
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
// dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { toolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { ToolsRepository } from '../features/shared/lib/database/repositories/tools-repository';
import { allAvailableTools } from '../features/shared/lib/database/seeds/data/tools-data';

async function setupSingleTool(toolName: string) {
  console.log(`🚀 Setting up tool: ${toolName}...\n`);

  try {
    // Find the tool in available tools
    const tool = allAvailableTools.find(t => t.name === toolName);

    if (!tool) {
      console.error(`❌ Tool '${toolName}' not found in available tools.`);
      console.log('\n📋 Available tools:');
      allAvailableTools.forEach(t => console.log(`  - ${t.name}`));
      process.exit(1);
    }

    console.log(`📝 Tool found: ${tool.name} (v${tool.version})`);
    console.log(`📄 Description: ${tool.description}`);

    // Check if tool already exists
    const toolsRepository = new ToolsRepository();
    const existingTool = await toolsRepository.findOne({ name: toolName });

    if (existingTool) {
      console.log(`🔄 Tool exists, updating...`);
      // Update existing tool
      await toolsRepository.updateOne(
        { name: toolName },
        {
          description: tool.description,
          version: tool.version,
          dynamic_parameters: tool.dynamic_parameters,
          business_specific: tool.business_specific,
          function_schema: tool.function_schema,
          output_template: tool.output_template
        }
      );
      console.log(`✅ Tool '${toolName}' updated successfully!`);
    } else {
      console.log(`➕ Tool doesn't exist, creating...`);
      // Create new tool
      await toolsSeeder.create(tool);
      console.log(`✅ Tool '${toolName}' created successfully!`);
    }

    console.log(`\n🎉 Tool '${toolName}' setup completed!`);

  } catch (error) {
    console.error(`❌ Tool setup failed:`, error);
    process.exit(1);
  }
}

// Get tool name from command line arguments
const toolName = process.argv[2];

if (!toolName) {
  console.error('❌ Please provide a tool name as an argument.');
  console.log('\n📖 Usage: npm run setup-tool <tool_name>');
  console.log('📖 Example: npm run setup-tool send_sms_booking_confirmation');
  console.log('\n📋 Available tools:');
  allAvailableTools.forEach(t => console.log(`  - ${t.name}`));
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  setupSingleTool(toolName).then(() => {
    console.log(`\n✅ Tool '${toolName}' is ready!`);
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
}

export { setupSingleTool };
