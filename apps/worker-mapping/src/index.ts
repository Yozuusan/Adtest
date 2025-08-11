// IMPORTANT: Import Sentry instrumentation first
import './instrument';
import Sentry from './instrument';

import { createClient } from 'redis';
import { chromium, Browser, Page } from 'playwright';
import { config } from 'dotenv';
import { cacheService } from './services/cache';
import { mappingService } from './services/mapping';
import { shopifyService } from './services/shopify';
import { themeAnalyzerService, DOMData } from './services/themeAnalyzer';
import { logger } from './utils/logger';

// Load environment variables
config();

class MappingWorker {
  private redis: ReturnType<typeof createClient>;
  private browser: Browser | null = null;
  private isRunning = false;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL
    });

    this.redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      logger.info('✅ Redis connected for job processing');
    });
  }

  /**
   * Initialize the worker
   */
  async init(): Promise<void> {
    try {
      await this.redis.connect();
      await cacheService.connect();
      await mappingService.connect();
      
      // Launch browser
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      logger.info('🚀 Mapping worker initialized');
    } catch (error) {
      logger.error('Failed to initialize worker:', { error: String(error) });
      
      // Capture initialization error in Sentry
      Sentry.captureException(error, {
        tags: {
          operation: 'workerInit'
        },
        extra: {
          error: String(error)
        }
      });
      
      throw error;
    }
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔄 Starting job processing...');

    while (this.isRunning) {
      try {
        await this.processNextJob();
        // Small delay to prevent busy waiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Error processing job:', { error: String(error) });
        // Continue processing other jobs
      }
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.browser) {
      await this.browser.close();
    }
    
    await this.redis.quit();
    await cacheService.disconnect();
    await mappingService.disconnect();
    
    logger.info('🛑 Worker stopped');
  }

  /**
   * Process the next available job
   */
  private async processNextJob(): Promise<void> {
    try {
      // Get all shop queues
      const shopKeys = await this.redis.keys('mapping_queue:*');
      
      for (const queueKey of shopKeys) {
        const shopId = queueKey.replace('mapping_queue:', '');
        
        // Process jobs for this shop
        const jobData = await this.redis.rPop(queueKey);
        
        if (jobData) {
          const job = JSON.parse(jobData);
          await this.processJob(job);
        }
      }
    } catch (error) {
      logger.error('Error in processNextJob:', { error: String(error) });
    }
  }

  /**
   * Process a single mapping job
   */
  private async processJob(job: any): Promise<void> {
    const { id, shop_id, product_url, product_gid, options } = job;
    
    logger.info(`📋 Processing job ${id} for shop ${shop_id}`);

    try {
      // Update job status
      await this.updateJobStatus(id, 'running', { progress: 10 });

      // Extract product URL if we only have product_gid
      let url = product_url;
      if (!url && product_gid) {
        try {
          // Get shop domain from Redis or use a default pattern
          const shopDomain = await this.getShopDomain(shop_id);
          url = shopifyService.convertProductGidToUrl(product_gid, shopDomain);
          logger.info(`🔗 Converted product GID to URL: ${url}`);
        } catch (error) {
          logger.error('Failed to convert product GID to URL:', { error: String(error) });
          throw new Error('Invalid product GID or shop domain');
        }
      }

      if (!url) {
        throw new Error('No product URL available');
      }

      // Load page with Playwright
      await this.updateJobStatus(id, 'running', { progress: 30 });
      const page = await this.browser!.newPage();
      
      // Set viewport and user agent
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });

      // Navigate to product page
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for product content to load
      await page.waitForSelector('.product-form, [data-product], .product', { timeout: 10000 });

      await this.updateJobStatus(id, 'running', { progress: 50 });

      // Extract DOM and heuristics
      const domData = await this.extractPageData(page);
      
      await this.updateJobStatus(id, 'running', { progress: 70 });

      // Generate theme adapter using OpenAI
      const themeAdapter = await themeAnalyzerService.generateThemeAdapter(domData, options);
      
      await this.updateJobStatus(id, 'running', { progress: 90 });

      // Store theme adapter in cache
      await cacheService.setThemeAdapter(shop_id, themeAdapter.theme_fingerprint, themeAdapter);

      // Update job status to completed
      await this.updateJobStatus(id, 'completed', { 
        progress: 100,
        result: { fingerprint: themeAdapter.theme_fingerprint, adapter: themeAdapter }
      });

      logger.info(`✅ Job ${id} completed successfully`);

      await page.close();

        } catch (error) {
      logger.error(`❌ Job ${id} failed:`, { error: String(error) });
      
      // Capture error in Sentry with job context
      Sentry.captureException(error, {
        tags: {
          jobId: id,
          shopId: job.shop_id,
          operation: 'processJob'
        },
        extra: {
          job,
          error: String(error)
        }
      });
      
      await this.updateJobStatus(id, 'failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract relevant data from the page
   */
  private async extractPageData(page: Page): Promise<any> {
    const data = await page.evaluate(() => {
      // Helper function to generate CSS selector
      function getSelector(element: Element): string {
        if (element.id) return `#${element.id}`;
        if (element.className) {
          const classes = Array.from(element.classList).join('.');
          return `.${classes}`;
        }
        return element.tagName.toLowerCase();
      }

      // Product information
      const selectors = ['h1', '.product-title', '[data-product-title]', '.product__title'];
      let product_title = '';
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          product_title = el.textContent?.trim() || '';
          break;
        }
      }

      // Product form
      const form = document.querySelector('.product-form, form[action*="/cart/add"], .product__form');
      const product_form = form ? {
        selector: getSelector(form),
        has_submit: !!form.querySelector('button[type="submit"], input[type="submit"]'),
        has_quantity: !!form.querySelector('input[name="quantity"], .quantity-selector'),
        has_variant_selector: !!form.querySelector('select[name="id"], .variant-selector')
      } : null;

      // Product images
      const images = document.querySelectorAll('.product__image, .product-image, [data-product-image] img');
      const product_images = Array.from(images).map(img => ({
        src: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt,
        selector: getSelector(img)
      }));

      // Product description
      const descSelectors = ['.product-description', '.product__description', '[data-product-description]'];
      let product_description = '';
      for (const selector of descSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          product_description = el.textContent?.trim() || '';
          break;
        }
      }

      // USP lists
      const lists = document.querySelectorAll('ul, ol');
      const usp_lists = Array.from(lists)
        .filter(list => list.children.length > 0)
        .map(list => ({
          items: Array.from(list.children).map(li => li.textContent?.trim()),
          selector: getSelector(list)
        }))
        .slice(0, 3); // Limit to first 3 lists

      // Badges and labels
      const badges = document.querySelectorAll('.badge, .label, .tag, [class*="badge"], [class*="label"]');
      const product_badges = Array.from(badges).map(badge => ({
        text: badge.textContent?.trim(),
        selector: getSelector(badge)
      }));

      return {
        product_title,
        product_form,
        product_images,
        product_description,
        usp_lists,
        badges: product_badges,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    });

    return data;
  }

  /**
   * Get shop domain from Redis or use default pattern
   */
  private async getShopDomain(shopId: string): Promise<string> {
    try {
      // Try to get shop domain from Redis cache
      const shopKey = `shop:${shopId}`;
      const shopData = await this.redis.get(shopKey);
      
      if (shopData) {
        const shop = JSON.parse(shopData);
        if (shop.domain) {
          return shop.domain;
        }
      }
      
      // Fallback to default pattern if no cached data
      logger.warn(`No cached shop domain for ${shopId}, using default pattern`);
      return `${shopId}.myshopify.com`;
      
    } catch (error) {
      logger.error('Failed to get shop domain:', { error: String(error) });
      return `${shopId}.myshopify.com`;
    }
  }

  /**
   * Update job status using mapping service
   */
  private async updateJobStatus(jobId: string, status: string, data: any): Promise<void> {
    await mappingService.updateJobStatus(jobId, status, data);
  }
}

// Main execution
async function main() {
  const worker = new MappingWorker();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('🔄 Received SIGINT, shutting down gracefully...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('🔄 Received SIGTERM, shutting down gracefully...');
    await worker.stop();
    process.exit(1);
  });

  // Global error handler with Sentry
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error: String(error) });
    Sentry.captureException(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason: String(reason), promise: String(promise) });
    Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
    process.exit(1);
  });

  try {
    await worker.init();
    await worker.start();
  } catch (error) {
    logger.error('Worker failed:', { error: String(error) });
    Sentry.captureException(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MappingWorker };
