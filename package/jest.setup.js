// Jest setup file for comprehensive auth module testing

// Clear env vars before tests
delete process.env.NODE_ENV;
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  console.log('🧪 Setting up comprehensive AuthModule test environment...');
});

afterAll(() => {
  console.log('🏁 AuthModule tests completed!');
});