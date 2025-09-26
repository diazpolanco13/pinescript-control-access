/**
 * Jest Setup File
 * Global test configuration and utilities
 */

const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' || '.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  // Generate random test data
  generateRandomId: () => Math.random().toString(36).substr(2, 9),

  // Mock TradingView response
  mockTradingViewResponse: (status = 200, data = {}) => ({
    status,
    data,
    headers: {
      'set-cookie': [`sessionid=${global.testUtils.generateRandomId()}; Path=/`]
    }
  }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Test timeout helper
  withTimeout: (promise, timeoutMs = 5000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
};

// Custom matchers
expect.extend({
  toBeValidPineId(received) {
    const pass = typeof received === 'string' && received.startsWith('PUB;') && received.length > 10;
    return {
      message: () => `expected ${received} to be a valid Pine ID`,
      pass
    };
  },

  toBeValidDuration(received) {
    const pass = typeof received === 'string' && /^\d+[YMWD]$/.test(received);
    return {
      message: () => `expected ${received} to be a valid duration format (e.g., "7D", "1M")`,
      pass
    };
  }
});

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();

  // Clear any test data or cache
  if (global.testData) {
    delete global.testData;
  }
});
