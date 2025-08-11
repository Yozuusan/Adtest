// Test configuration for Sentry testing
import { config } from 'dotenv';

// Set test environment
process.env.NODE_ENV = 'test';

// Load test environment variables
config({ path: '.env.test' });

// Set default test values if not in .env.test
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-key';
}

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'debug';
}

export const testConfig = {
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL
};
