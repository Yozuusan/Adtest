import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface DOMData {
  product_title: string;
  product_form: any;
  product_images: Array<{
    src: string;
    alt: string;
    selector: string;
  }>;
  product_description: string;
  usp_lists: Array<{
    text: string;
    selector: string;
  }>;
  badges: Array<{
    text: string;
    selector: string;
  }>;
  url: string;
  timestamp: string;
}

export interface ThemeAdapter {
  selectors: Record<string, string>;
  order: string[];
  confidence: Record<string, number>;
  strategies: Record<string, 'text' | 'html' | 'image_src' | 'list_text'>;
  theme_fingerprint: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisOptions {
  extract_images?: boolean;
  extract_usp?: boolean;
  extract_badges?: boolean;
  confidence_threshold?: number;
  max_selectors?: number;
}

export class ThemeAnalyzerService {
  private openai: OpenAI | null = null;
  private defaultOptions: Required<AnalysisOptions> = {
    extract_images: true,
    extract_usp: true,
    extract_badges: true,
    confidence_threshold: 0.7,
    max_selectors: 10
  };

  constructor() {
    // OpenAI will be initialized lazily when first used
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is missing or empty');
      }
      this.openai = new OpenAI({
        apiKey: apiKey
      });
    }
    return this.openai;
  }

  /**
   * Generate a theme adapter using OpenAI analysis
   */
  async generateThemeAdapter(domData: DOMData, options: AnalysisOptions = {}): Promise<ThemeAdapter> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const startTime = Date.now();
      logger.info('🤖 Starting OpenAI theme analysis', { options: opts });

      const prompt = this.buildAnalysisPrompt(domData, opts);
      
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a Shopify theme analysis expert. Analyze the provided DOM data and create a comprehensive theme adapter that can be used to inject dynamic content into product pages.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const adapter = JSON.parse(response);
      
      // Validate the response structure
      if (!this.validateAdapterStructure(adapter)) {
        throw new Error('Invalid adapter structure from OpenAI');
      }

      const duration = Date.now() - startTime;
      logger.performance('OpenAI theme analysis', duration, { 
        model: 'gpt-4', 
        tokens: completion.usage?.total_tokens 
      });

      // Generate theme fingerprint
      const fingerprint = this.generateThemeFingerprint(domData);
      
      return {
        ...adapter,
        theme_fingerprint: fingerprint,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('OpenAI API error:', { error: String(error) });
      logger.warn('Falling back to basic theme adapter');
      return this.generateFallbackAdapter(domData, opts);
    }
  }

  /**
   * Build a comprehensive prompt for OpenAI analysis
   */
  private buildAnalysisPrompt(domData: DOMData, options: Required<AnalysisOptions>): string {
    return `Analyze the following Shopify product page DOM data and create a theme adapter.

DOM Data:
- Product Title: "${domData.product_title}"
- Product Form: ${JSON.stringify(domData.product_form, null, 2)}
- Product Images: ${JSON.stringify(domData.product_images, null, 2)}
- Product Description: "${domData.product_description}"
- USP Lists: ${JSON.stringify(domData.usp_lists, null, 2)}
- Badges: ${JSON.stringify(domData.badges, null, 2)}
- URL: ${domData.url}

Requirements:
- Extract up to ${options.max_selectors} CSS selectors for key content areas
- Focus on areas where dynamic content can be injected
- Assign confidence scores (0.0-1.0) for each selector
- Determine the best injection strategy for each area
- Order selectors by importance and injection priority

Return a JSON object with this exact structure:
{
  "selectors": {
    "product_title": "h1.product-title, .product__title",
    "product_price": ".product-price, [data-price]",
    "product_description": ".product-description, .product__description",
    "product_images": ".product-gallery img, .product__media img",
    "usp_list": ".usp-list li, .product-benefits li",
    "badges": ".product-badge, .badge"
  },
  "order": ["product_title", "product_price", "product_images", "product_description", "usp_list", "badges"],
  "confidence": {
    "product_title": 0.95,
    "product_price": 0.88,
    "product_description": 0.82,
    "product_images": 0.90,
    "usp_list": 0.75,
    "badges": 0.70
  },
  "strategies": {
    "product_title": "text",
    "product_price": "text",
    "product_description": "html",
    "product_images": "image_src",
    "usp_list": "list_text",
    "badges": "text"
  }
}

Focus on selectors with confidence >= ${options.confidence_threshold}.`;
  }

  /**
   * Validate the OpenAI response structure
   */
  private validateAdapterStructure(adapter: any): adapter is Omit<ThemeAdapter, 'theme_fingerprint' | 'created_at' | 'updated_at'> {
    return (
      adapter &&
      typeof adapter === 'object' &&
      adapter.selectors &&
      typeof adapter.selectors === 'object' &&
      Array.isArray(adapter.order) &&
      adapter.confidence &&
      typeof adapter.confidence === 'object' &&
      adapter.strategies &&
      typeof adapter.strategies === 'object'
    );
  }

  /**
   * Generate a fallback theme adapter when OpenAI fails
   */
  private generateFallbackAdapter(domData: DOMData, options: Required<AnalysisOptions>): ThemeAdapter {
    logger.info('🔄 Generating fallback theme adapter');
    
    const fingerprint = this.generateThemeFingerprint(domData);
    
    return {
      selectors: {
        product_title: 'h1, .product-title, .product__title, [data-product-title]',
        product_price: '.price, .product-price, [data-price], .money',
        product_description: '.product-description, .product__description, .description',
        product_images: '.product-gallery img, .product__media img, .product-image',
        usp_list: '.usp-list li, .benefits li, .features li',
        badges: '.badge, .product-badge, .tag'
      },
      order: ['product_title', 'product_price', 'product_images', 'product_description', 'usp_list', 'badges'],
      confidence: {
        product_title: 0.8,
        product_price: 0.7,
        product_description: 0.6,
        product_images: 0.8,
        usp_list: 0.5,
        badges: 0.5
      },
      strategies: {
        product_title: 'text',
        product_price: 'text',
        product_description: 'html',
        product_images: 'image_src',
        usp_list: 'list_text',
        badges: 'text'
      },
      theme_fingerprint: fingerprint,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Generate a theme fingerprint based on DOM structure
   */
  generateThemeFingerprint(domData: DOMData): string {
    try {
      // Create a hash of key DOM elements for theme identification
      const keyElements = [
        domData.product_title,
        domData.product_form?.selector || '',
        domData.product_images.length.toString(),
        domData.usp_lists.length.toString(),
        domData.badges.length.toString()
      ].join('|');

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < keyElements.length; i++) {
        const char = keyElements.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Buffer.from(Math.abs(hash).toString()).toString('base64').substring(0, 8);
    } catch (error) {
              logger.error('Failed to generate theme fingerprint:', { error: String(error) });
      return 'unknown';
    }
  }

  /**
   * Analyze the confidence of selectors based on DOM data
   */
  analyzeSelectorConfidence(selector: string, domData: DOMData): number {
    // Simple heuristic-based confidence scoring
    let confidence = 0.5; // Base confidence

    // Higher confidence for more specific selectors
    if (selector.includes('data-')) confidence += 0.2;
    if (selector.includes('id=')) confidence += 0.15;
    if (selector.includes('class=')) confidence += 0.1;

    // Higher confidence for shorter, more specific selectors
    const selectorParts = selector.split(',').map(s => s.trim());
    if (selectorParts.length === 1) confidence += 0.1;
    if (selector.length < 50) confidence += 0.1;

    // Cap confidence at 0.95
    return Math.min(confidence, 0.95);
  }
}

export const themeAnalyzerService = new ThemeAnalyzerService();
