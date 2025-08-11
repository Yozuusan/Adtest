// Test script to verify Sentry integration
import './test-config';
import './instrument';
import Sentry from './instrument';
import { logger } from './utils/logger';

async function testSentry() {
  logger.info('🧪 Testing Sentry integration...');
  
  try {
    // Simulate an error to test Sentry
    throw new Error('This is a test error to verify Sentry integration');
  } catch (error) {
    logger.error('Test error caught:', { error: String(error) });
    
    // Capture the test error in Sentry
    Sentry.captureException(error, {
      tags: {
        test: 'sentry-integration',
        environment: 'test'
      },
      extra: {
        testType: 'manual',
        timestamp: new Date().toISOString()
      }
    });
    
    logger.info('✅ Test error captured in Sentry');
  }
  
  // Test Sentry message
  Sentry.captureMessage('Sentry integration test completed successfully', 'info');
  logger.info('✅ Sentry message captured');
  
  // Wait a moment for Sentry to send data
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  logger.info('✅ Sentry test completed');
  process.exit(0);
}

// Run the test
testSentry().catch(error => {
  logger.error('Test failed:', { error: String(error) });
  process.exit(1);
});
