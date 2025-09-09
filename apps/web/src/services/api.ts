const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Products API
  async getProducts(shop: string, search?: string, limit = 20): Promise<any[]> {
    const params = new URLSearchParams({ shop, limit: limit.toString() });
    if (search) params.append('search', search);
    
    console.log('🔄 API.getProducts called:', { shop, search, limit });
    console.log('🔗 API URL:', `${API_BASE_URL}/products?${params.toString()}`);
    
    try {
      const result = await this.request(`/products?${params.toString()}`) as { data?: { products?: any[] } };
      console.log('✅ API.getProducts success:', { count: result.data?.products?.length || 0 });
      
      if (!result.data?.products) {
        console.warn('⚠️ No products data in response:', result);
        return [];
      }
      
      return result.data.products;
    } catch (error) {
      console.error('❌ API.getProducts error:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getProduct(productId: string, shop: string): Promise<any> {
    return this.request(`/products/${productId}?shop=${shop}`);
  }

  // Variants API
  async createVariant(variantData: any): Promise<any> {
    return this.request('/variants', {
      method: 'POST',
      body: JSON.stringify(variantData),
    });
  }

  async getVariants(shop: string): Promise<any[]> {
    return this.request(`/variants?shop=${shop}`);
  }

  async updateVariant(handle: string, updates: any): Promise<any> {
    return this.request(`/variants/${handle}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteVariant(handle: string, shop: string): Promise<void> {
    return this.request(`/variants/${handle}?shop=${shop}`, {
      method: 'DELETE',
    });
  }

  // Analytics API
  async getAnalyticsStats(shop: string, period = '7d'): Promise<any> {
    return this.request(`/analytics/stats?shop=${shop}&period=${period}`);
  }

  async getAnalyticsEvents(shop: string, limit = 50, offset = 0): Promise<any> {
    return this.request(`/analytics/events?shop=${shop}&limit=${limit}&offset=${offset}`);
  }

  // Brand Analysis API
  async analyzeBrand(shop: string): Promise<any> {
    return this.request(`/brand/analyze?shop=${shop}`);
  }

  async getBrandAnalysis(shop: string): Promise<any> {
    return this.request(`/brand/summary?shop=${shop}`);
  }

  // AI Variants API
  async analyzeCreative(formData: FormData): Promise<any> {
    return this.request('/ai-variants/analyze-creative', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async generateVariant(formData: FormData): Promise<any> {
    return this.request('/ai-variants/generate', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  // Mapping API
  async buildMapping(mappingData: any): Promise<any> {
    return this.request('/mapping/build', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  }

  async getMappingStatus(jobId: string): Promise<any> {
    return this.request(`/mapping/status/${jobId}`);
  }

  // User Shops API
  async getUserShops(userId: string): Promise<any[]> {
    console.log('🔄 API.getUserShops called for user:', userId);
    try {
      const result = await this.request(`/user-shops/${userId}`) as { shops?: any[] };
      console.log('✅ API.getUserShops success:', result);
      return result.shops || [];
    } catch (error) {
      console.error('❌ API.getUserShops error:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();
