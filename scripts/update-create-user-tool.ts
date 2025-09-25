#!/usr/bin/env tsx

/**
 * Update Create User Tool Script
 *
 * Updates the create_user tool to version 1.0.1 with phone_number requirement
 * This script adds the new version without affecting existing tools
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { toolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { createUserTool } from '../features/shared/lib/database/seeds/data/tools-data';

async function updateCreateUserTool() {
  console.log('🔧 Updating create_user tool to version 1.0.1...\n');

  try {
    // Check if tool exists (any version)
    const existingTool = await toolsSeeder.findOne({
      name: 'create_user'
    });

    if (existingTool) {
      console.log(`📋 Found existing create_user v${existingTool.version} - updating to v1.0.1...`);

      // Update the existing tool to new version
      const updatedTool = await toolsSeeder.updateOne(
        { name: 'create_user' },
        {
          version: createUserTool.version,
          function_schema: createUserTool.function_schema,
          description: createUserTool.description,
          output_template: createUserTool.output_template
        }
      );
      console.log(`✅ Updated create_user to v${updatedTool.version} with phone_number requirement`);
    } else {
      console.log('📋 No existing create_user tool found - creating new...');

      // Create the new tool
      const newTool = await toolsSeeder.create(createUserTool);
      console.log(`✅ Created create_user v${newTool.version} with phone_number requirement`);
    }

    console.log('\n🎉 create_user tool update completed!');
    console.log('📋 Changes:');
    console.log('   - Version: 1.0.0 → 1.0.1');
    console.log('   - Required: first_name, phone_number');
    console.log('   - Optional: last_name');
    console.log('   - Removed: email requirement');
    console.log('\n💡 Note: All businesses using create_user will now use the updated version automatically.');

  } catch (error) {
    console.error('❌ Tool update failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateCreateUserTool().then(() => {
    console.log('\n✅ Tool update completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });
}

export { updateCreateUserTool };
