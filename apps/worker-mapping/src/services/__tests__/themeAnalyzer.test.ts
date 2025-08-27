import { ThemeAnalyzerService } from '../themeAnalyzer';

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
                selectors: {
                  product_title: 'h1.product-title',
                  product_price: '.price'
                },
                order: ['product_title', 'product_price'],
                confidence: {
                  product_title: 0.9,
                  product_price: 0.8
                },
                strategies: {
                  product_title: 'text',
                  product_price: 'text'
                }
              })
            }
          }],
          usage: { total_tokens: 100 }
        })
      }
    }
  }))
}));

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';

describe('ThemeAnalyzerService', () => {
  let analyzer: ThemeAnalyzerService;

  beforeEach(() => {
    analyzer = new ThemeAnalyzerService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateThemeAdapter', () => {
    it('should generate theme adapter with valid structure', async () => {
      const mockDomData = {
        product_title: 'Test Product',
        product_form: { selector: '.product-form' },
        product_images: [{ src: 'test.jpg', alt: 'Test', selector: 'img' }],
        product_description: 'Test description',
        usp_lists: [{ text: 'Feature 1', selector: '.feature' }],
        badges: [{ text: 'Sale', selector: '.badge' }],
        url: 'https://test-shop.myshopify.com/products/test-product',
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      const result = await analyzer.generateThemeAdapter(mockDomData);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('selectors');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('strategies');
      expect(result).toHaveProperty('theme_fingerprint');
    });
  });

  describe('generateThemeFingerprint', () => {
    it('should generate consistent fingerprint for same DOM data', () => {
      const mockDomData = {
        product_title: 'Test Product',
        product_form: { selector: '.product-form' },
        product_images: [{ src: 'test.jpg', alt: 'Test', selector: 'img' }],
        product_description: 'Test description',
        usp_lists: [{ text: 'Feature 1', selector: '.feature' }],
        badges: [{ text: 'Sale', selector: '.badge' }],
        url: 'https://test-shop.myshopify.com/products/test-product',
        timestamp: '2023-01-01T00:00:00Z'
      };

      const fingerprint1 = analyzer.generateThemeFingerprint(mockDomData);
      const fingerprint2 = analyzer.generateThemeFingerprint(mockDomData);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toBeTruthy();
    });
  });

  describe('analyzeSelectorConfidence', () => {
    it('should return higher confidence for data attributes', () => {
      const mockDomData = {
        product_title: 'Test Product',
        product_form: { selector: '.product-form' },
        product_images: [],
        product_description: 'Test description',
        usp_lists: [],
        badges: [],
        url: 'https://test-shop.myshopify.com',
        timestamp: '2023-01-01T00:00:00Z'
      };

      const dataAttrConfidence = analyzer.analyzeSelectorConfidence('[data-product-title]', mockDomData);
      const classConfidence = analyzer.analyzeSelectorConfidence('.product-title', mockDomData);

      expect(dataAttrConfidence).toBeGreaterThan(classConfidence);
    });
  });
});