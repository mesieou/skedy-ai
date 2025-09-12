#!/usr/bin/env tsx

/**
 * Setup Skedy Business Script
 *
 * Creates the complete Skedy business setup with:
 * - Business (Skedy AI)
 * - Super Admin (Juan Bernal)
 * - AI Agent Service (pay-as-you-go)
 * - 14 Frequent Questions
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });
import { skedyBusinessSetupSeeder } from '../features/shared/lib/database/seeds/skedy-business-setup';

async function main() {
  try {
    console.log('🚀 Starting Skedy business setup...\n');

    const setup = await skedyBusinessSetupSeeder.createSkedyBusinessSetup();

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log('================');
    console.log(`Business ID: ${setup.business.id}`);
    console.log(`Super Admin ID: ${setup.superAdmin.id}`);
    console.log(`Service ID: ${setup.service.id}`);
    console.log(`FAQ Questions: ${setup.frequentQuestions.length}`);
    console.log('\n✅ Skedy is ready to handle calls! 🤖📞');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
