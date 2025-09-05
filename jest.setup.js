// Jest setup file for AuthModule testing

// Mock Redis to avoid actual connections during testing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
  }));
});

// Set test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  console.log('🧪 Setting up AuthModule test environment...');
});

afterAll(() => {
  console.log('🏁 AuthModule tests completed!');
});