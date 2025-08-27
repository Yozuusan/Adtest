import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MappingWorker } from './index';
import { cacheService } from './services/cache';
import { mappingService } from './services/mapping';
import { shopifyService } from './services/shopify';
import { themeAnalyzerService } from './services/themeAnalyzer';

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                selectors: { product_title: 'h1' },
                order: ['product_title'],
                confidence: { product_title: 0.9 },
                strategies: { product_title: 'text' }
              })
            }
          }],
          usage: { total_tokens: 50 }
        })
      }
    }
  }))
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    isReady: true
  }))
}));

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.REDIS_URL = 'redis://localhost:6379';

describe('MappingWorker', () => {
  let worker: MappingWorker;

  beforeAll(() => {
    worker = new MappingWorker();
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should create a MappingWorker instance', () => {
    expect(worker).toBeInstanceOf(MappingWorker);
  });

  it('should have all required services available', () => {
    expect(cacheService).toBeDefined();
    expect(mappingService).toBeDefined();
    expect(shopifyService).toBeDefined();
    expect(themeAnalyzerService).toBeDefined();
  });

  it('should convert product GID to URL correctly', () => {
    const gid = 'gid://shopify/Product/123456789';
    const domain = 'test-shop.myshopify.com';
    const url = shopifyService.convertProductGidToUrl(gid, domain);
    
    expect(url).toBe('https://test-shop.myshopify.com/products/123456789');
  });

  it('should validate Shopify product URLs', () => {
    const validUrl = 'https://shop.myshopify.com/products/product-handle';
    const invalidUrl = 'https://example.com/page';
    
    expect(shopifyService.isValidShopifyProductUrl(validUrl)).toBe(true);
    expect(shopifyService.isValidShopifyProductUrl(invalidUrl)).toBe(false);
  });

  it('should extract shop domain from URL', () => {
    const url = 'https://my-shop.myshopify.com/products/test';
    const domain = shopifyService.extractShopDomainFromUrl(url);
    
    expect(domain).toBe('my-shop.myshopify.com');
  });

  it('should generate theme fingerprint from DOM data', () => {
    const domData = {
      product_title: 'Test Product',
      product_form: { selector: '.product-form' },
      product_images: [{ src: 'test.jpg', alt: 'Test', selector: '.product-image' }],
      product_description: 'Test description',
      usp_lists: [{ text: 'Feature 1', selector: '.usp-list' }],
      badges: [{ text: 'New', selector: '.badge' }],
      url: 'https://test.com/products/test',
      timestamp: new Date().toISOString()
    };

    const fingerprint = themeAnalyzerService.generateThemeFingerprint(domData);
    
    expect(fingerprint).toBeDefined();
    expect(typeof fingerprint).toBe('string');
    expect(fingerprint.length).toBeGreaterThan(0);
  });

  it('should analyze selector confidence', () => {
    const domData = {
      product_title: 'Test',
      product_form: { selector: '.product-form' },
      product_images: [],
      product_description: 'Test',
      usp_lists: [],
      badges: [],
      url: 'https://test.com',
      timestamp: new Date().toISOString()
    };

    const confidence1 = themeAnalyzerService.analyzeSelectorConfidence('[data-product-title]', domData);
    const confidence2 = themeAnalyzerService.analyzeSelectorConfidence('.very-long-selector-with-many-classes', domData);
    
    expect(confidence1).toBeGreaterThan(confidence2);
    expect(confidence1).toBeLessThanOrEqual(0.95);
  });
});

describe('CacheService', () => {
  it('should have required methods', () => {
    expect(typeof cacheService.setThemeAdapter).toBe('function');
    expect(typeof cacheService.getThemeAdapter).toBe('function');
    expect(typeof cacheService.invalidateThemeAdapter).toBe('function');
    expect(typeof cacheService.clearShopCache).toBe('function');
    expect(typeof cacheService.getStats).toBe('function');
  });
});

describe('MappingService', () => {
  it('should have required methods', () => {
    expect(typeof mappingService.updateJobStatus).toBe('function');
    expect(typeof mappingService.getJobStatus).toBe('function');
    expect(typeof mappingService.getShopJobs).toBe('function');
    expect(typeof mappingService.cancelJob).toBe('function');
    expect(typeof mappingService.getJobStats).toBe('function');
    expect(typeof mappingService.cleanupOldJobs).toBe('function');
  });
});

describe('ThemeAnalyzerService', () => {
  it('should have required methods', () => {
    expect(typeof themeAnalyzerService.generateThemeAdapter).toBe('function');
    expect(typeof themeAnalyzerService.generateThemeFingerprint).toBe('function');
    expect(typeof themeAnalyzerService.analyzeSelectorConfidence).toBe('function');
  });
});
