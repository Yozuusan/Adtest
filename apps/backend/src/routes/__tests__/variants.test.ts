import request from 'supertest';
import express from 'express';
import variantsRouter from '../variants';
import { shopifyService } from '../../services/shopify';

// Mock the Shopify service
jest.mock('../../services/shopify');
const mockedShopifyService = shopifyService as jest.Mocked<typeof shopifyService>;

describe('Variants Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/variants', variantsRouter);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /variants/:handle', () => {
    it('should return variant data when variant exists', async () => {
      const mockVariant = {
        handle: 'test-variant',
        content_json: '{"title": "Test Variant"}',
        product_gid: 'gid://shopify/Product/123',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockedShopifyService.isShopAuthenticated.mockResolvedValue(true);
      mockedShopifyService.getVariantByHandle.mockResolvedValue(mockVariant);

      const response = await request(app)
        .get('/variants/test-variant?shop=test.myshopify.com')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          handle: 'test-variant',
          shop: 'test.myshopify.com',
          content: { title: 'Test Variant' },
          product_gid: 'gid://shopify/Product/123',
          created_at: '2024-01-01T00:00:00Z',
          retrieved_at: expect.any(String)
        }
      });
    });

    it('should return 404 when variant does not exist', async () => {
      mockedShopifyService.isShopAuthenticated.mockResolvedValue(true);
      mockedShopifyService.getVariantByHandle.mockResolvedValue(null);

      const response = await request(app)
        .get('/variants/nonexistent?shop=test.myshopify.com')
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('not found')
      });
    });

    it('should return 400 when shop parameter is missing', async () => {
      const response = await request(app)
        .get('/variants/test-variant')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('required')
      });
    });
  });

  describe('GET /variants', () => {
    it('should return list of variants', async () => {
      const mockVariants = [
        {
          handle: 'variant-1',
          product_gid: 'gid://shopify/Product/123',
          content_json: '{"title": "Variant 1"}',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          handle: 'variant-2',
          product_gid: 'gid://shopify/Product/124',
          content_json: '{"title": "Variant 2"}',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      mockedShopifyService.isShopAuthenticated.mockResolvedValue(true);
      mockedShopifyService.getAllVariants.mockResolvedValue(mockVariants);

      const response = await request(app)
        .get('/variants?shop=test.myshopify.com')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          shop: 'test.myshopify.com',
          variants: [
            {
              handle: 'variant-1',
              product_gid: 'gid://shopify/Product/123',
              content: { title: 'Variant 1' },
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              handle: 'variant-2',
              product_gid: 'gid://shopify/Product/124',
              content: { title: 'Variant 2' },
              created_at: '2024-01-02T00:00:00Z'
            }
          ],
          count: 2,
          retrieved_at: expect.any(String)
        }
      });
    });
  });

  describe('DELETE /variants/:handle', () => {
    it('should delete variant successfully', async () => {
      mockedShopifyService.isShopAuthenticated.mockResolvedValue(true);
      mockedShopifyService.deleteVariantByHandle.mockResolvedValue(true);

      const response = await request(app)
        .delete('/variants/test-variant?shop=test.myshopify.com')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Variant deleted successfully',
        data: {
          handle: 'test-variant',
          shop: 'test.myshopify.com',
          deleted_at: expect.any(String)
        }
      });
    });

    it('should return 404 when variant to delete does not exist', async () => {
      mockedShopifyService.isShopAuthenticated.mockResolvedValue(true);
      mockedShopifyService.deleteVariantByHandle.mockResolvedValue(false);

      const response = await request(app)
        .delete('/variants/nonexistent?shop=test.myshopify.com')
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('not found')
      });
    });
  });
});