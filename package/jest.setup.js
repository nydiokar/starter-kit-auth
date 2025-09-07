// Jest setup file for comprehensive auth module testing
jest.useFakeTimers('modern');

// Clear env vars before tests
delete process.env.NODE_ENV;
process.env.NODE_ENV = 'test';

// Seed random number generator for consistent tests
const originalMathRandom = Math.random;
Math.random = jest.fn(() => 0.5);

// Global test helpers
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for async operations
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test setup
beforeAll(() => {
  console.log('🧪 Setting up comprehensive AuthModule test environment...');
});

afterAll(() => {
  // Restore original Math.random
  Math.random = originalMathRandom;
  console.log('🏁 AuthModule tests completed!');
});