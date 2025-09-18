#!/usr/bin/env tsx

/**
 * Setup Tools Script
 *
 * Populates the tools library with all available tools
 * Run this once to create the tools that businesses can use
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { toolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { allAvailableTools } from '../features/shared/lib/database/seeds/data/tools-data';

async function setupTools() {
  console.log('🚀 Starting tools library setup...\n');

  try {
    // Create all tools in the tools table
    await toolsSeeder.createMultiple(allAvailableTools);

    console.log('\n🎉 Tools library setup completed!');

  } catch (error) {
    console.error('❌ Tools setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupTools().then(() => {
    console.log('\n✅ Tools library is ready!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
}

export { setupTools };
