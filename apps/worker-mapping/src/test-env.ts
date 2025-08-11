// Test script to verify environment variables are accessible
import { config } from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables from root .env
config({ path: '../../.env' });

async function testEnvironment() {
  logger.info('🧪 Testing environment variables...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'OPENAI_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN'
  ];
  
  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      logger.info(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      logger.error(`❌ ${varName}: MISSING`);
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    logger.error(`❌ Missing ${missingVars.length} environment variables:`, missingVars);
    process.exit(1);
  } else {
    logger.info('✅ All environment variables are present!');
  }
  
  // Test Redis connection
  try {
    const { createClient } = await import('redis');
    const redis = createClient({
      url: process.env.UPSTASH_REDIS_REST_URL
    });
    
    await redis.connect();
    logger.info('✅ Redis connection successful');
    await redis.quit();
  } catch (error) {
    logger.error('❌ Redis connection failed:', { error: String(error) });
  }
  
  logger.info('✅ Environment test completed');
}

testEnvironment().catch(error => {
  logger.error('Test failed:', { error: String(error) });
  process.exit(1);
});
