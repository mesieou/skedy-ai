// Load .env.test for Jest tests
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env.test')
});
