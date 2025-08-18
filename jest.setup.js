// Jest setup file - runs before each test

import '@testing-library/jest-dom';
import { initializeTestDatabase } from './features/shared/lib/test-setup';

// Initialize database client once for all tests
beforeAll(async () => {
  await initializeTestDatabase();
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Note: fetch is not available in Jest environment
// Real API tests will fail gracefully and fall back to mock data

// Environment variables now loaded from .env.test file

