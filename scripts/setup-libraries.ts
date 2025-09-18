#!/usr/bin/env tsx

/**
 * Setup All Libraries Script
 *
 * Populates both tools and prompts libraries
 * Run this once to set up the complete system libraries
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { setupTools } from './setup-tools';
import { setupPrompts } from './setup-prompts';

async function setupAllLibraries() {
  console.log('🚀 Starting complete libraries setup...\n');

  try {
    // Setup tools library
    console.log('📦 Step 1: Setting up tools library...');
    await setupTools();

    console.log('\n📝 Step 2: Setting up prompts library...');
    await setupPrompts();

    console.log('\n🎉 All libraries setup completed!');
    console.log('🔧 Tools library: Ready');
    console.log('📝 Prompts library: Ready');
    console.log('\n✨ You can now create businesses that will use these libraries!');

  } catch (error) {
    console.error('❌ Libraries setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupAllLibraries().then(() => {
    console.log('\n✅ System libraries are ready!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
}

export { setupAllLibraries };
