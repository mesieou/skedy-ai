#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';

async function validateCredentials() {
  const serviceAccountKeyPath = path.join(__dirname, 'service-account-key.json');

  console.log('🔍 Validating Google Cloud credentials...\n');

  // Check if file exists
  if (!fs.existsSync(serviceAccountKeyPath)) {
    console.error('❌ Service account key file not found');
    console.log(`Expected location: ${serviceAccountKeyPath}`);
    console.log('\n🔧 Create the file by copying from template:');
    console.log('cp scripts/git-sheets/service-account-key.json.template scripts/git-sheets/service-account-key.json');
    return false;
  }

  try {
    // Read and parse JSON
    const keyFileContent = fs.readFileSync(serviceAccountKeyPath, 'utf-8');
    const credentials = JSON.parse(keyFileContent);

    console.log('✅ JSON file is valid');

    // Check required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
    const missingFields = requiredFields.filter(field => !credentials[field]);

    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    console.log('✅ All required fields present');

    // Check if still using template values
    if (credentials.private_key.includes('YOUR_PRIVATE_KEY_HERE') ||
        credentials.private_key_id === 'YOUR_PRIVATE_KEY_ID') {
      console.error('❌ Still using template placeholder values');
      console.log('Please replace YOUR_PRIVATE_KEY_HERE and YOUR_PRIVATE_KEY_ID with actual values from Google Cloud Console');
      return false;
    }

    console.log('✅ No template placeholders detected');

    // Check private key format
    if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----') ||
        !credentials.private_key.includes('-----END PRIVATE KEY-----')) {
      console.error('❌ Invalid private key format');
      console.log('Private key should start with "-----BEGIN PRIVATE KEY-----" and end with "-----END PRIVATE KEY-----"');
      return false;
    }

    console.log('✅ Private key format looks correct');

    // Test authentication
    console.log('🔐 Testing authentication...');

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    if (accessToken.token) {
      console.log('✅ Authentication successful!');
      console.log('🎉 Your credentials are working correctly');
      return true;
    } else {
      console.error('❌ Failed to get access token');
      return false;
    }

  } catch (error) {
    console.error('❌ Validation failed:');

    if (error instanceof SyntaxError) {
      console.error('   Invalid JSON format in service account key file');
    } else if (error instanceof Error && error.message?.includes('DECODER routines')) {
      console.error('   Private key format is corrupted or invalid');
      console.log('   Try downloading a fresh key from Google Cloud Console');
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ${errorMessage}`);
    }

    console.log('\n🔧 To get a new service account key:');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Navigate to: IAM & Admin > Service Accounts');
    console.log('3. Find: skedy-358@seventh-odyssey-474804-m2.iam.gserviceaccount.com');
    console.log('4. Click "Keys" > "Add Key" > "Create New Key" > "JSON"');
    console.log('5. Download and replace the contents of:');
    console.log(`   ${serviceAccountKeyPath}`);

    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateCredentials().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { validateCredentials };
