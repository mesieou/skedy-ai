#!/usr/bin/env tsx

/**
 * Deploy Tool to All Businesses Script
 *
 * Adds or updates a specific tool to all businesses in the database.
 * Useful for deploying new tools or updating existing ones across all businesses.
 *
 * Usage:
 *   npm run deploy-tool <tool_name>
 *
 * Examples:
 *   npm run deploy-tool send_sms_booking_confirmation
 *   npm run deploy-tool get_quote
 *   npm run deploy-tool create_booking
 *
 * The script will:
 * 1. Find the tool definition in tools-data.ts
 * 2. Ensure the tool exists in the tools table
 * 3. Get all businesses from the database
 * 4. Add/update the tool for each business in business_tools table
 * 5. Show progress and results
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

import { toolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { ToolsRepository } from '../features/shared/lib/database/repositories/tools-repository';
import { BusinessRepository } from '../features/shared/lib/database/repositories/business-repository';
import { BusinessToolsRepository } from '../features/shared/lib/database/repositories/business-tools-repository';
import { allAvailableTools } from '../features/shared/lib/database/seeds/data/tools-data';

async function deployToolToAllBusinesses(toolName: string) {
  console.log(`🚀 Deploying tool '${toolName}' to all businesses...\n`);

  try {
    // Step 1: Find the tool in available tools
    const toolDefinition = allAvailableTools.find(t => t.name === toolName);

    if (!toolDefinition) {
      console.error(`❌ Tool '${toolName}' not found in available tools.`);
      console.log('\n📋 Available tools:');
      allAvailableTools.forEach(t => console.log(`  - ${t.name}`));
      process.exit(1);
    }

    console.log(`📝 Tool found: ${toolDefinition.name} (v${toolDefinition.version})`);
    console.log(`📄 Description: ${toolDefinition.description}\n`);

    // Step 2: Ensure tool exists in tools table
    const toolsRepository = new ToolsRepository();
    let tool = await toolsRepository.findOne({ name: toolName });

    if (!tool) {
      console.log(`➕ Tool doesn't exist in tools table, creating...`);
      tool = await toolsSeeder.create(toolDefinition);
      console.log(`✅ Tool created in tools table\n`);
    } else {
      console.log(`✅ Tool exists in tools table\n`);
    }

    // Step 3: Get all businesses
    const businessRepository = new BusinessRepository();
    const businesses = await businessRepository.findAll();

    if (businesses.length === 0) {
      console.log(`⚠️ No businesses found in database`);
      process.exit(0);
    }

    console.log(`🏢 Found ${businesses.length} businesses to update\n`);

    // Step 4: Add/update tool for each business
    const businessToolsRepository = new BusinessToolsRepository();
    let successCount = 0;
    let updateCount = 0;
    let createCount = 0;
    let errorCount = 0;

    for (const business of businesses) {
      try {
        console.log(`🔄 Processing business: ${business.name} (${business.id})`);

        // Check if business already has this tool
        const existingBusinessTool = await businessToolsRepository.findOne({
          business_id: business.id,
          tool_id: tool.id
        });

        if (existingBusinessTool) {
          // Update existing business tool (ensure it's active)
          await businessToolsRepository.updateOne(
            { business_id: business.id, tool_id: tool.id },
            { active: true }
          );
          console.log(`  ✅ Updated existing tool for ${business.name}`);
          updateCount++;
        } else {
          // Create new business tool
          await businessToolsRepository.create({
            business_id: business.id,
            tool_id: tool.id,
            active: true
          });
          console.log(`  ➕ Added new tool for ${business.name}`);
          createCount++;
        }

        successCount++;

      } catch (error) {
        console.error(`  ❌ Failed to process ${business.name}:`, error);
        errorCount++;
      }
    }

    // Step 5: Show summary
    console.log(`\n📊 DEPLOYMENT SUMMARY:`);
    console.log(`  🏢 Total businesses: ${businesses.length}`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ➕ Created: ${createCount}`);
    console.log(`  🔄 Updated: ${updateCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log(`\n⚠️ Some businesses failed to update. Check logs above.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 Tool '${toolName}' successfully deployed to all businesses!`);
    }

  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    process.exit(1);
  }
}

// Get tool name from command line arguments
const toolName = process.argv[2];

if (!toolName) {
  console.error('❌ Please provide a tool name as an argument.');
  console.log('\n📖 Usage: npm run deploy-tool <tool_name>');
  console.log('📖 Example: npm run deploy-tool send_sms_booking_confirmation');
  console.log('\n📋 Available tools:');
  allAvailableTools.forEach(t => console.log(`  - ${t.name}`));
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  deployToolToAllBusinesses(toolName).then(() => {
    console.log(`\n✅ Deployment of '${toolName}' completed!`);
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  });
}

export { deployToolToAllBusinesses };
