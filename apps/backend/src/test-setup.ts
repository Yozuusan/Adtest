// Jest setup file for backend tests
import { config } from 'dotenv';

// Load environment variables for tests
config({ path: '../../.env.test' });

// Mock console.log for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};