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

async function setupPrompts() {
  console.log('🚀 Starting prompts library setup...\n');

  try {
    // Create all prompt templates in the prompts table
    await promptsSeeder.createMultiple(allAvailablePrompts);

    console.log('\n🎉 Prompts library setup completed!');

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
