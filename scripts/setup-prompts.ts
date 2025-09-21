#!/usr/bin/env tsx

/**
 * Setup Prompts Script
 *
 * Populates the prompts library with all available prompt templates
 * Run this once to create the prompt templates that businesses can use
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { promptsSeeder } from '../features/shared/lib/database/seeds/prompts-seeder';
import { allAvailablePrompts } from '../features/shared/lib/database/seeds/data/prompts-data';
import { PROMPTS_NAMES } from '../features/shared/lib/database/types/prompt';

async function setupPrompts() {
  console.log('🚀 Starting prompts library setup...\n');

  try {
    // Only create prompts that match the PROMPTS_NAMES enum
    const validPromptNames = Object.values(PROMPTS_NAMES) as string[];
    const validPrompts = allAvailablePrompts.filter(prompt =>
      validPromptNames.includes(prompt.prompt_name)
    );

    console.log(`📝 Creating ${validPrompts.length} valid prompts (filtered by PROMPTS_NAMES enum):`);

    let createdCount = 0;
    for (const promptData of validPrompts) {
      // Check if prompt already exists to avoid duplicates
      const existing = await promptsSeeder.findOne({
        business_category: promptData.business_category,
        prompt_name: promptData.prompt_name,
        prompt_version: promptData.prompt_version
      });

      if (!existing) {
        await promptsSeeder.create(promptData);
        console.log(`✅ Created: ${promptData.prompt_name} v${promptData.prompt_version} (${promptData.business_category})`);
        createdCount++;
      } else {
        console.log(`⏭️ Skipped: ${promptData.prompt_name} v${promptData.prompt_version} (already exists)`);
      }
    }

    console.log(`\n🎉 Prompts library setup completed! Created ${createdCount} new prompts.`);

  } catch (error) {
    console.error('❌ Prompts setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupPrompts().then(() => {
    console.log('\n✅ Prompts library is ready!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
}

export { setupPrompts };
