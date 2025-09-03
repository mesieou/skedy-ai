#!/usr/bin/env tsx

/**
 * Test script to see the complete prompt output
 * Usage: tsx features/agent/__tests__/intelligence/prompt-output-demo.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables exactly like Jest does
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

// Force admin client for standalone script execution (must be set before imports)
process.env.NEXT_RUNTIME = 'nodejs';

import { businessContextProvider } from '../../../shared/lib/database/business-context-provider';
import { PromptBuilder } from '../../intelligence/prompt-builder';
import { DatabaseClientFactory } from '../../../shared/lib/client-factory';

async function testPromptOutput() {
  try {
    console.log('🔥 Testing Prompt Builder Output...\n');

    // Initialize admin client explicitly for standalone script
    console.log('🔧 Initializing admin database client...');
    await DatabaseClientFactory.getAdminClient();

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

    // Get business context
    console.log(`📋 Fetching business context for Twilio SID: ${twilioAccountSid}`);
    const businessContext = await businessContextProvider.getBusinessContextByTwilioSid(twilioAccountSid);

    console.log(`✅ Found business: ${businessContext.businessInfo.name}`);
    console.log(`🛠️  Services: ${businessContext.services.length}`);
    console.log(`❓ FAQs: ${businessContext.frequently_asked_questions.length}\n`);

    // Build complete prompt
    console.log('🤖 Building complete AI receptionist prompt...\n');
    const fullPrompt = PromptBuilder.buildPrompt(businessContext, {
      includeTools: true,
      customInstructions: "Focus on closing leads quickly and professionally."
    });

    console.log('📝 COMPLETE PROMPT OUTPUT:');
    console.log('='.repeat(80));
    console.log(fullPrompt);
    console.log('='.repeat(80));

    console.log(`\n📊 Prompt Statistics:`);
    console.log(`- Total length: ${fullPrompt.length} characters`);
    console.log(`- Word count: ~${fullPrompt.split(' ').length} words`);
    console.log(`- Lines: ${fullPrompt.split('\n').length}`);

    // Test business name injection
    console.log('\n🎯 Testing business name injection...\n');

    const testText = "Welcome to {BusinessName}, how can {BusinessName} help you today?";
    const injectedText = PromptBuilder.injectBusinessName(testText, businessContext.businessInfo.name);
    console.log('🏷️  BUSINESS NAME INJECTION TEST:');
    console.log('-'.repeat(40));
    console.log(`Original: ${testText}`);
    console.log(`Injected: ${injectedText}`);
    console.log('-'.repeat(40));

    console.log('\n✅ Prompt testing completed successfully!');

  } catch (error) {
    console.error('❌ Error testing prompt output:', error);
    process.exit(1);
  }
}

// Run the test
testPromptOutput().catch(console.error);
