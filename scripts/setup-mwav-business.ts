#!/usr/bin/env tsx

/**
 * Setup Man With A Van Business Script
 *
 * Uses BusinessSetupOrchestrator for clean, declarative setup
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { BusinessSetupOrchestrator } from '../features/shared/lib/database/utils/business-setup-orchestrator';
import { createMWAVBusinessData } from '../features/shared/lib/database/seeds/data/business-data';
import {
  mwavMediumTruckService,
  mwavLargeTruckService,
  mwavXLTruck2MoversService,
  mwavXLTruck3MoversService
} from '../features/shared/lib/database/seeds/data/services-data';
import { createMWAVOwnerUserData } from '../features/shared/lib/database/seeds/data/user-data';
import { createMWAVOwnerAuthUserData } from '../features/shared/lib/database/seeds/data/auth-user-data';
import { mwavTools } from '../features/shared/lib/database/seeds/data/tools-data';
import { PROMPTS_NAMES } from '../features/shared/lib/database/types/prompt';

async function main() {
  try {
    console.log('🚀 Starting Man With A Van business setup...\n');

    const orchestrator = new BusinessSetupOrchestrator();

    // Declarative configuration - all the data, no logic!
    const result = await orchestrator.setupBusiness({
      // Required
      businessData: createMWAVBusinessData(),

      // Optional - Users
      adminUser: {
        userData: createMWAVOwnerUserData('placeholder'), // businessId filled automatically
        authData: createMWAVOwnerAuthUserData()
      },
      additionalProviders: 0,  // MWAV has 30 providers but we don't manage them
      createCustomer: false,    // Not needed for MWAV

      // Optional - Services
      services: [
        mwavMediumTruckService,
        mwavLargeTruckService,
        mwavXLTruck2MoversService,
        mwavXLTruck3MoversService
      ],

      // Optional - Calendar & Availability (skip for MWAV)
      // calendarSettings: undefined,
      // generateAvailability: undefined,

      // Optional - Tools & Prompts
      tools: mwavTools,
      promptName: PROMPTS_NAMES.MWAV_REMOVALIST,
      promptVersion: 'v1.0.0',

      // Optional - Knowledge Base
      loadWebsite: {
        url: 'https://www.manwithavan.com.au/',
        tableName: 'documents'
      }
    });

    // Summary
    console.log('\n🎉 Man With A Van business setup completed!');
    console.log('📋 Setup Summary:');
    console.log(`   Business: ${result.business.name}`);
    console.log(`   Phone: ${result.business.phone_number}`);
    console.log(`   Admin: ${result.adminUser?.email}`);
    console.log(`   Services: ${result.services.length}`);
    console.log(`   Tools: ${result.toolsLinked}`);
    console.log(`   Prompt: ${result.promptLinked ? 'Linked' : 'Not found'}`);
    console.log(`   Knowledge Base: ${result.knowledgeBaseLoaded ? 'Loaded' : 'Failed'}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Set env var: OPENAI_API_KEY_MWAV=your_key');
    console.log('   2. Test the flow via phone: +61879436787');
    console.log('   3. When ready, get MWAV API credentials for get_mwav_quote');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
