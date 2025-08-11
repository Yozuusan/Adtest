# Adlign Mapping Worker

A Node.js worker service that analyzes Shopify product pages using Playwright and OpenAI to generate theme adapters for dynamic content injection.

## Overview

The Mapping Worker is responsible for:

1. **Job Processing**: Consuming mapping jobs from Redis queues
2. **Web Scraping**: Using Playwright to load and analyze Shopify product pages
3. **DOM Analysis**: Extracting key page elements and structure
4. **AI-Powered Analysis**: Using OpenAI GPT-4 to generate intelligent theme adapters
5. **Caching**: Storing generated adapters in Redis for fast retrieval

## Features

- **Headless Browser Automation**: Uses Playwright for reliable page loading
- **Intelligent Content Detection**: Identifies product titles, forms, images, and more
- **AI-Powered Analysis**: Leverages OpenAI for sophisticated theme analysis
- **Redis Integration**: Efficient job queuing and result caching
- **Graceful Shutdown**: Proper cleanup of resources
- **Comprehensive Logging**: Structured logging with different levels
- **Error Handling**: Robust error handling with fallback strategies

## Architecture

```
Redis Queue → Worker → Playwright → DOM Extraction → OpenAI Analysis → Theme Adapter → Cache
```

### Core Components

- **MappingWorker**: Main worker class that orchestrates the entire process
- **CacheService**: Manages Redis caching for theme adapters
- **MappingService**: Handles job status and Redis operations
- **ShopifyService**: Converts product GIDs to URLs and validates Shopify domains
- **ThemeAnalyzerService**: Uses OpenAI to generate theme adapters from DOM data

## Setup

### Prerequisites

- Node.js 18+
- Redis server
- OpenAI API key
- Shopify API credentials

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here

# Logging Configuration
LOG_LEVEL=info

# Worker Configuration
WORKER_CONCURRENCY=1
WORKER_POLL_INTERVAL=1000
```

### Installation

```bash
# Install dependencies
npm install

# Build the worker
npm run build

# Start the worker
npm start
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run start:prod
```

### Job Format

Jobs are expected to have the following structure:

```json
{
  "id": "job_123",
  "shop_id": "shop_456",
  "product_url": "https://shop.myshopify.com/products/product-handle",
  "product_gid": "gid://shopify/Product/123456789",
  "priority": "normal",
  "options": {
    "extract_images": true,
    "extract_usp": true,
    "extract_badges": true,
    "confidence_threshold": 0.7
  }
}
```

### Output Format

The worker generates theme adapters with this structure:

```json
{
  "selectors": {
    "product_title": "h1.product-title, .product__title",
    "product_price": ".product-price, [data-price]",
    "product_description": ".product-description, .product__description"
  },
  "order": ["product_title", "product_price", "product_description"],
  "confidence": {
    "product_title": 0.95,
    "product_price": 0.88,
    "product_description": 0.82
  },
  "strategies": {
    "product_title": "text",
    "product_price": "text",
    "product_description": "html"
  },
  "theme_fingerprint": "abc123def",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

## API Reference

### MappingWorker

Main worker class that processes mapping jobs.

#### Methods

- `init()`: Initialize Redis connections and Playwright browser
- `start()`: Start processing jobs from Redis queues
- `stop()`: Gracefully shutdown the worker
- `processNextJob()`: Process the next available job
- `processJob(job)`: Process a specific mapping job

### CacheService

Manages Redis caching for theme adapters.

#### Methods

- `setThemeAdapter(shopId, fingerprint, adapter)`: Cache a theme adapter
- `getThemeAdapter(shopId, fingerprint)`: Retrieve a cached theme adapter
- `invalidateThemeAdapter(shopId, fingerprint)`: Remove a theme adapter from cache
- `clearShopCache(shopId)`: Clear all cached adapters for a shop

### MappingService

Handles job status updates and Redis operations.

#### Methods

- `updateJobStatus(jobId, status, data)`: Update job status and progress
- `getJobStatus(jobId)`: Get current job status
- `getShopJobs(shopId, limit)`: Get jobs for a specific shop
- `cancelJob(jobId)`: Cancel a running job

### ThemeAnalyzerService

Uses OpenAI to analyze DOM data and generate theme adapters.

#### Methods

- `generateThemeAdapter(domData, options)`: Generate a theme adapter using OpenAI
- `generateThemeFingerprint(domData)`: Create a unique theme fingerprint
- `analyzeSelectorConfidence(selector, domData)`: Analyze selector confidence

## Configuration

### Browser Settings

The worker launches Playwright with optimized settings for production:

- Headless mode enabled
- Disabled sandbox for containerized environments
- Optimized memory usage
- Disabled GPU acceleration

### Redis Configuration

- Job status TTL: 24 hours
- Theme adapter cache TTL: 7 days
- Automatic cleanup of old completed jobs

### OpenAI Configuration

- Model: GPT-4
- Temperature: 0.3 (for consistent results)
- Max tokens: 2000
- Response format: JSON

## Monitoring

### Logging

The worker provides structured logging with different levels:

- `debug`: Detailed debugging information
- `info`: General information about operations
- `warn`: Warning messages
- `error`: Error messages with context

### Metrics

Track performance with built-in metrics:

- Job processing time
- OpenAI API response time
- Cache hit/miss rates
- Browser page load times

## Error Handling

The worker implements comprehensive error handling:

1. **OpenAI Failures**: Falls back to basic theme adapters
2. **Page Load Errors**: Retries with exponential backoff
3. **Redis Connection Issues**: Automatic reconnection
4. **Browser Crashes**: Restart browser instance

## Scaling

### Horizontal Scaling

Run multiple worker instances:

```bash
# Worker 1
NODE_ENV=production npm start

# Worker 2 (in another terminal)
NODE_ENV=production npm start
```

### Vertical Scaling

Adjust worker concurrency and timeouts:

```bash
WORKER_CONCURRENCY=3
WORKER_POLL_INTERVAL=500
BROWSER_TIMEOUT=60000
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server status
   - Verify REDIS_URL environment variable

2. **OpenAI API Errors**
   - Verify API key is valid
   - Check rate limits and quotas

3. **Browser Launch Failures**
   - Ensure system has required dependencies
   - Check available memory

4. **Job Processing Stuck**
   - Check Redis queue status
   - Verify worker is running and connected

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

## Contributing

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure proper error handling

## License

Private - Adlign internal use only
