import { ThemeAnalyzer } from '../themeAnalyzer';

// Mock Playwright browser
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn(),
        evaluate: jest.fn(),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

describe('ThemeAnalyzer', () => {
  let analyzer: ThemeAnalyzer;

  beforeEach(() => {
    analyzer = new ThemeAnalyzer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeTheme', () => {
    it('should analyze theme and return selectors', async () => {
      const mockUrl = 'https://test-shop.myshopify.com/products/test-product';
      
      const result = await analyzer.analyzeTheme(mockUrl);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('selectors');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle invalid URLs gracefully', async () => {
      const invalidUrl = 'not-a-valid-url';
      
      await expect(analyzer.analyzeTheme(invalidUrl)).rejects.toThrow();
    });
  });

  describe('detectSelectors', () => {
    it('should detect common Shopify theme selectors', () => {
      const mockElements = [
        { selector: 'h1.product-title', tagName: 'H1', className: 'product-title' },
        { selector: '.product-description', tagName: 'DIV', className: 'product-description' },
        { selector: '.add-to-cart', tagName: 'BUTTON', className: 'add-to-cart' }
      ];

      const selectors = analyzer.detectSelectors(mockElements);

      expect(selectors).toBeDefined();
      expect(selectors.title).toContain('h1.product-title');
      expect(selectors.description).toContain('.product-description');
      expect(selectors.add_to_cart).toContain('.add-to-cart');
    });
  });

  describe('calculateConfidence', () => {
    it('should return higher confidence for well-structured themes', () => {
      const mockSelectors = {
        title: 'h1.product-title',
        description: '.product-description',
        price: '.product-price',
        add_to_cart: '.add-to-cart'
      };

      const confidence = analyzer.calculateConfidence(mockSelectors, 10);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return lower confidence for themes with few identifiable elements', () => {
      const mockSelectors = {
        title: 'h1'
      };

      const confidence = analyzer.calculateConfidence(mockSelectors, 2);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(0.5);
    });
  });
});