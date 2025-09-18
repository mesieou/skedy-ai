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

import { BusinessSeeder } from '../features/shared/lib/database/seeds/business-seeder';
import { UserSeeder } from '../features/shared/lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../features/shared/lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../features/shared/lib/database/seeds/service-seeder';
import { FrequentQuestionsSeeder } from '../features/shared/lib/database/seeds/frequent-questions-seeder';
import { createSuperAdminAuthUserData } from '../features/shared/lib/database/seeds/data/auth-user-data';
import { createSuperAdminUserData } from '../features/shared/lib/database/seeds/data/user-data';
import { skedyAIAgentServiceData } from '../features/shared/lib/database/seeds/data/services-data';

async function main() {
  try {
    console.log('🚀 Starting Skedy business setup...\n');

    // Initialize seeders
    const businessSeeder = new BusinessSeeder();
    const authUserSeeder = new AuthUserSeeder();
    const userSeeder = new UserSeeder(authUserSeeder);
    const serviceSeeder = new ServiceSeeder();
    const frequentQuestionsSeeder = new FrequentQuestionsSeeder();

    // Step 1: Create Skedy Business
    console.log('🏢 Creating Skedy business...');
    const business = await businessSeeder.createSkedyBusiness();
    console.log(`✅ Skedy business created: ${business.name}`);

    // Step 2: Create Super Admin User (Juan Bernal)
    console.log('👤 Creating super admin user...');
    const userData = createSuperAdminUserData(business.id);
    const authUserData = createSuperAdminAuthUserData();
    const superAdmin = await userSeeder.createUserWith(userData, authUserData);
    console.log(`✅ Super admin created: ${superAdmin.first_name} ${superAdmin.last_name}`);

    // Step 3: Create AI Agent Service
    console.log('🤖 Creating AI Agent service...');
    const serviceData = { ...skedyAIAgentServiceData, business_id: business.id };
    const service = await serviceSeeder.createWithRequirements(serviceData);
    console.log(`✅ AI Agent service created: ${service.name}`);

    // Step 4: Create Frequent Questions
    console.log('❓ Creating frequent questions...');
    const frequentQuestions = await frequentQuestionsSeeder.createSkedyFrequentQuestions(business.id);
    console.log(`✅ Created ${frequentQuestions.length} frequent questions`);

    console.log('\n🎉 Skedy business setup completed!');
    console.log('📋 Setup Summary:');
    console.log(`   Business: ${business.name}`);
    console.log(`   Email: ${business.email}`);
    console.log(`   Phone: ${business.phone_number}`);
    console.log(`   Super Admin: ${superAdmin.first_name} ${superAdmin.last_name}`);
    console.log(`   Service: ${service.name}`);
    console.log(`   FAQ Questions: ${frequentQuestions.length}`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
