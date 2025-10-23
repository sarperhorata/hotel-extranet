import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to ignore console.log in tests
  // log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Mock database for unit tests (unless testing database operations)
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

// Global test utilities
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  tenantId: 'test-tenant-id',
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();
