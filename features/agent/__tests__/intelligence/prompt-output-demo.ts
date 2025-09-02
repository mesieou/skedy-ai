#!/usr/bin/env tsx

/**
 * Test script to see the complete prompt output
 * Usage: tsx features/agent/__tests__/intelligence/prompt-output-demo.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../../.env.test'), override: true });

// Admin client will be used automatically for local development

import { businessContextProvider } from '../../../shared/lib/database/business-context-provider';
import { PromptBuilder } from '../../intelligence/prompt-builder';

async function testPromptOutput() {
  try {
    console.log('🔥 Testing Prompt Builder Output...\n');

    const twilioAccountSid = process.env.TEST_TWILIO_ACCOUNT_SID || 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

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

    // Test other prompt types
    console.log('\n🎯 Testing specific prompt types...\n');

    const greetingPrompt = PromptBuilder.buildGreetingPrompt(businessContext.businessInfo.name);
    console.log('📞 GREETING PROMPT:');
    console.log('-'.repeat(40));
    console.log(greetingPrompt);
    console.log('-'.repeat(40));

    const closingPrompt = PromptBuilder.buildClosingPrompt(businessContext.businessInfo.name);
    console.log('\n🎯 CLOSING PROMPT:');
    console.log('-'.repeat(40));
    console.log(closingPrompt);
    console.log('-'.repeat(40));

    const objectionPrompt = PromptBuilder.buildObjectionHandlingPrompt();
    console.log('\n🛡️  OBJECTION HANDLING PROMPT:');
    console.log('-'.repeat(40));
    console.log(objectionPrompt);
    console.log('-'.repeat(40));

    console.log('\n✅ Prompt testing completed successfully!');

  } catch (error) {
    console.error('❌ Error testing prompt output:', error);
    process.exit(1);
  }
}

// Run the test
testPromptOutput().catch(console.error);
