// Test setup helper to initialize database client
import { DatabaseClientFactory, ClientType } from './client-factory';

/**
 * Initialize database client for tests
 * Call this once before running tests to avoid client initialization errors
 */
export async function initializeTestDatabase(): Promise<void> {
  // Explicitly use ADMIN client for tests (override auto-detection)
  await DatabaseClientFactory.getClient({ type: ClientType.ADMIN });
}

/**
 * Reset database client (useful for test cleanup)
 */
export function resetTestDatabase(): void {
  DatabaseClientFactory.reset();
}
