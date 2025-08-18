// Test setup helper to initialize database client
import { DatabaseClientFactory } from './client-factory';

/**
 * Initialize database client for tests
 * Call this once before running tests to avoid client initialization errors
 */
export async function initializeTestDatabase(): Promise<void> {
  await DatabaseClientFactory.getClient();
}

/**
 * Reset database client (useful for test cleanup)
 */
export function resetTestDatabase(): void {
  DatabaseClientFactory.reset();
}
