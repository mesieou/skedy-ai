// Load environment files for Jest tests
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local for personal environment variables (including API keys)
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});

// Load .env.test for test-specific overrides (if it exists)
dotenv.config({
  path: path.resolve(process.cwd(), '.env.test'),
  override: true  // Override variables from .env.local
});
