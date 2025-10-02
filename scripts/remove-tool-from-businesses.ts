#!/usr/bin/env tsx

/**
 * Remove Tool from All Businesses Script
 *
 * Deactivates or removes a specific tool from all businesses in the database.
 * Useful for deprecating tools or removing them from production.
 *
 * Usage:
 *   npm run remove-tool <tool_name> [--delete]
 *
 * Examples:
 *   npm run remove-tool old_tool_name              # Deactivates tool
 *   npm run remove-tool old_tool_name --delete     # Completely removes tool
 *
 * The script will:
 * 1. Find the tool in the tools table
 * 2. Get all businesses that have this tool
 * 3. Either deactivate or delete the tool from business_tools table
 * 4. Show progress and results
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

import { ToolsRepository } from '../features/shared/lib/database/repositories/tools-repository';
import { BusinessRepository } from '../features/shared/lib/database/repositories/business-repository';
import { BusinessToolsRepository } from '../features/shared/lib/database/repositories/business-tools-repository';

async function removeToolFromAllBusinesses(toolName: string, deleteCompletely: boolean = false) {
  const action = deleteCompletely ? 'Removing' : 'Deactivating';
  console.log(`🚀 ${action} tool '${toolName}' from all businesses...\n`);

  try {
    // Step 1: Find the tool in tools table
    const toolsRepository = new ToolsRepository();
    const tool = await toolsRepository.findOne({ name: toolName });

    if (!tool) {
      console.error(`❌ Tool '${toolName}' not found in tools table.`);
      process.exit(1);
    }

    console.log(`📝 Tool found: ${tool.name} (v${tool.version})`);
    console.log(`📄 Description: ${tool.description}\n`);

    // Step 2: Get all businesses that have this tool
    const businessToolsRepository = new BusinessToolsRepository();
    const businessRepository = new BusinessRepository();

    // Get all business tools for this tool
    const businessTools = await businessToolsRepository.findAll({}, { tool_id: tool.id });

    if (businessTools.length === 0) {
      console.log(`⚠️ No businesses currently have this tool`);
      process.exit(0);
    }

    console.log(`🏢 Found ${businessTools.length} businesses with this tool\n`);

    // Step 3: Process each business
    let successCount = 0;
    let errorCount = 0;

    for (const businessTool of businessTools) {
      try {
        // Get business details for logging
        const business = await businessRepository.findOne({ id: businessTool.business_id });
        const businessName = business?.name || `Business ${businessTool.business_id}`;

        console.log(`🔄 Processing business: ${businessName}`);

        if (deleteCompletely) {
          // Delete the business tool completely
          await businessToolsRepository.deleteOne({
            business_id: businessTool.business_id,
            tool_id: tool.id
          });
          console.log(`  🗑️ Removed tool from ${businessName}`);
        } else {
          // Just deactivate the tool
          await businessToolsRepository.updateOne(
            { business_id: businessTool.business_id, tool_id: tool.id },
            { active: false }
          );
          console.log(`  ⏸️ Deactivated tool for ${businessName}`);
        }

        successCount++;

      } catch (error) {
        console.error(`  ❌ Failed to process business:`, error);
        errorCount++;
      }
    }

    // Step 4: Show summary
    console.log(`\n📊 REMOVAL SUMMARY:`);
    console.log(`  🏢 Total businesses processed: ${businessTools.length}`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  🔧 Action: ${deleteCompletely ? 'Deleted' : 'Deactivated'}`);

    if (errorCount > 0) {
      console.log(`\n⚠️ Some businesses failed to update. Check logs above.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 Tool '${toolName}' successfully ${deleteCompletely ? 'removed from' : 'deactivated for'} all businesses!`);
    }

  } catch (error) {
    console.error(`❌ Removal failed:`, error);
    process.exit(1);
  }
}

// Get arguments from command line
const toolName = process.argv[2];
const deleteFlag = process.argv[3] === '--delete';

if (!toolName) {
  console.error('❌ Please provide a tool name as an argument.');
  console.log('\n📖 Usage: npm run remove-tool <tool_name> [--delete]');
  console.log('📖 Examples:');
  console.log('   npm run remove-tool old_tool_name              # Deactivates tool');
  console.log('   npm run remove-tool old_tool_name --delete     # Completely removes tool');
  process.exit(1);
}

// Confirmation for delete action
if (deleteFlag) {
  console.log(`⚠️ WARNING: You are about to PERMANENTLY DELETE tool '${toolName}' from all businesses.`);
  console.log(`This action cannot be undone. Use without --delete flag to just deactivate.\n`);
}

// Run if called directly
if (require.main === module) {
  removeToolFromAllBusinesses(toolName, deleteFlag).then(() => {
    console.log(`\n✅ Removal of '${toolName}' completed!`);
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Removal failed:', error);
    process.exit(1);
  });
}

export { removeToolFromAllBusinesses };
