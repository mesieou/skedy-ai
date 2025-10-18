#!/usr/bin/env tsx

/**
 * Create/Update Tool Script
 *
 * Creates or updates a specific tool in the tools library
 * Usage: ./scripts/setup-tools.ts <tool-name>
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { toolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { allAvailableTools } from '../features/shared/lib/database/seeds/data/tools-data';

async function createUpdateTools(toolName?: string) {
  console.log('🚀 Starting tool create/update...\n');

  try {
    let toolsToProcess = allAvailableTools;

    // If specific tool name provided, filter to that tool
    if (toolName) {
      toolsToProcess = allAvailableTools.filter(tool => tool.name === toolName);

      if (toolsToProcess.length === 0) {
        console.log(`❌ Tool "${toolName}" not found in available tools`);
        console.log('\n💡 Available tools: ');
        allAvailableTools.forEach(tool => {
          console.log(`   - ${tool.name} (v${tool.version})`);
        });
        return;
      }

      console.log(`🔍 Processing tool: ${toolName}`);
    } else {
      console.log(`📝 Processing all ${allAvailableTools.length} available tools:`);
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const toolData of toolsToProcess) {
      // Check if tool already exists by name only (name is unique in DB)
      const existing = await toolsSeeder.findOne({
        name: toolData.name
      });

      if (!existing) {
        await toolsSeeder.create(toolData);
        console.log(`✅ Created: ${toolData.name} v${toolData.version}`);
        createdCount++;
      } else {
        // Update existing tool (version may have changed)
        await toolsSeeder.updateOne(
          { name: toolData.name },
          toolData
        );
        console.log(`🔄 Updated: ${toolData.name} v${toolData.version}`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Tool processing completed! Created ${createdCount}, Updated ${updatedCount}.`);

  } catch (error) {
    console.error('❌ Tool setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const toolName = process.argv[2];

  createUpdateTools(toolName).then(() => {
    console.log('\n✅ Tool library is ready!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
}

export { createUpdateTools };
