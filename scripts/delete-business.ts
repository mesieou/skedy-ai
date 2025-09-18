#!/usr/bin/env tsx

/**
 * Delete Business Script
 *
 * Deletes a business and all associated data
 * Usage: npx tsx scripts/delete-business.ts <business-id>
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { BusinessRepository } from '../features/shared/lib/database/repositories/business-repository';
import { UserRepository } from '../features/shared/lib/database/repositories/user-repository';
import { AuthUserRepository } from '../features/shared/lib/database/repositories/auth-user-repository';
import { ServiceRepository } from '../features/shared/lib/database/repositories/service-repository';
import { CalendarSettingsRepository } from '../features/shared/lib/database/repositories/calendar-settings-repository';
import { AvailabilitySlotsRepository } from '../features/shared/lib/database/repositories/availability-slots-repository';
import { ChatSessionRepository } from '../features/shared/lib/database/repositories/chat-session-repository';
import { BusinessToolsRepository } from '../features/shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '../features/shared/lib/database/repositories/business-prompt-repository';

async function deleteBusiness(businessId: string) {
  console.log(`🗑️ Deleting business: ${businessId}\n`);

  try {
    // Initialize repositories
    const businessRepo = new BusinessRepository();
    const userRepo = new UserRepository();
    const authUserRepo = new AuthUserRepository();
    const serviceRepo = new ServiceRepository();
    const calendarRepo = new CalendarSettingsRepository();
    const availabilityRepo = new AvailabilitySlotsRepository();
    const chatSessionRepo = new ChatSessionRepository();
    const businessToolsRepo = new BusinessToolsRepository();
    const businessPromptRepo = new BusinessPromptRepository();

    // Check if business exists
    const business = await businessRepo.findOne({ id: businessId });
    if (!business) {
      console.error(`❌ Business not found: ${businessId}`);
      process.exit(1);
    }

    console.log(`📊 Found business: ${business.name} (${business.email})`);
    console.log(`🗑️ Starting deletion of all associated data...\n`);

    // Delete in proper order (children first, then parent)

    // 1. Delete business tools
    console.log('🔧 Deleting business tools...');
    const businessTools = await businessToolsRepo.findAll({}, { business_id: businessId });
    for (const tool of businessTools) {
      await businessToolsRepo.deleteOne({ id: tool.id });
    }
    console.log(`✅ Deleted ${businessTools.length} business tools`);

    // 2. Delete business prompts
    console.log('📝 Deleting business prompts...');
    const businessPrompts = await businessPromptRepo.findAll({}, { business_id: businessId });
    for (const prompt of businessPrompts) {
      await businessPromptRepo.deleteOne({ id: prompt.id });
    }
    console.log(`✅ Deleted ${businessPrompts.length} business prompts`);

    // 3. Delete chat sessions (includes messages via cascade)
    console.log('💬 Deleting chat sessions...');
    const chatSessions = await chatSessionRepo.findAll({}, { business_id: businessId });
    for (const session of chatSessions) {
      await chatSessionRepo.deleteOne({ id: session.id });
    }
    console.log(`✅ Deleted ${chatSessions.length} chat sessions`);

    // 4. Delete availability slots
    console.log('🕐 Deleting availability slots...');
    const availabilitySlots = await availabilityRepo.findAll({}, { business_id: businessId });
    for (const slots of availabilitySlots) {
      await availabilityRepo.deleteOne({ id: slots.id });
    }
    console.log(`✅ Deleted ${availabilitySlots.length} availability slot records`);

    // 5. Delete calendar settings (for users of this business)
    console.log('📅 Deleting calendar settings...');
    const users = await userRepo.findAll({}, { business_id: businessId });
    let calendarCount = 0;
    for (const user of users) {
      const calendarSettings = await calendarRepo.findAll({}, { user_id: user.id });
      for (const calendar of calendarSettings) {
        await calendarRepo.deleteOne({ id: calendar.id });
        calendarCount++;
      }
    }
    console.log(`✅ Deleted ${calendarCount} calendar settings`);

    // 6. Delete services
    console.log('🛠️ Deleting services...');
    const services = await serviceRepo.findAll({}, { business_id: businessId });
    for (const service of services) {
      await serviceRepo.deleteOne({ id: service.id });
    }
    console.log(`✅ Deleted ${services.length} services`);

    // 7. Delete users and their auth records
    console.log('👥 Deleting users and auth records...');
    for (const user of users) {
      // Delete auth user first (user.id is the auth user ID)
      try {
        await authUserRepo.deleteOne({ id: user.id });
        console.log(`   ✅ Deleted auth user: ${user.email}`);
      } catch {
        console.warn(`   ⚠️ Auth user not found for: ${user.email}`);
      }

      // Delete user record
      await userRepo.deleteOne({ id: user.id });
      console.log(`   ✅ Deleted user: ${user.email}`);
    }
    console.log(`✅ Deleted ${users.length} users and their auth records`);

    // 8. Finally delete the business
    console.log('🏢 Deleting business...');
    await businessRepo.deleteOne({ id: businessId });
    console.log(`✅ Deleted business: ${business.name}`);

    console.log('\n🎉 Business deletion completed successfully!');
    console.log('📋 Deletion Summary:');
    console.log(`   Business: ${business.name}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Chat Sessions: ${chatSessions.length}`);
    console.log(`   Calendar Settings: ${calendarCount}`);
    console.log(`   Availability Slots: ${availabilitySlots.length}`);
    console.log(`   Business Tools: ${businessTools.length}`);
    console.log(`   Business Prompts: ${businessPrompts.length}`);

  } catch (error) {
    console.error('❌ Business deletion failed:', error);
    process.exit(1);
  }
}

async function main() {
  const businessId = process.argv[2];

  if (!businessId) {
    console.error('❌ Usage: npx tsx scripts/delete-business.ts <business-id>');
    console.error('   Example: npx tsx scripts/delete-business.ts 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  console.log('🗑️ Business Deletion Script\n');
  console.log(`Target Business ID: ${businessId}\n`);

  // Confirm deletion
  console.log('⚠️ WARNING: This will permanently delete the business and ALL associated data!');
  console.log('   - Users and their calendar settings');
  console.log('   - Services and pricing');
  console.log('   - Chat sessions and messages');
  console.log('   - Availability slots');
  console.log('   - Business tools and prompts configuration\n');

  await deleteBusiness(businessId);
}

main().catch(console.error);
