/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test file patterns - looks for __tests__ folders in features
  testMatch: [
    '<rootDir>/features/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/features/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  // Module name mapping for imports (correct property name)
  moduleNameMapping: {
    '^@/features/(.*)$': '<rootDir>/features/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Coverage collection
  collectCoverageFrom: [
    'features/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!features/**/__tests__/**',
    '!features/**/types/**',
    '!features/**/index.ts',
    '!app/**/__tests__/**',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // Transform TypeScript and JSX
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true
};

module.exports = config;