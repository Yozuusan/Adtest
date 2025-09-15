import { create } from 'zustand';
import { TEMPLATE_API } from '@/config/api';

interface QuotaInfo {
  plan_type: string;
  templates_limit: number;
  templates_used: number;
  templates_remaining: number;
  quota_exceeded: boolean;
}

interface TemplateUsage {
  id: string;
  template_name: string;
  product_handle: string;
  deployment_status: string;
  confidence_avg: number;
  test_url: string;
  created_at: string;
  deployed_at: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  status?: string;
  product_type?: string;
  vendor?: string;
  tags?: string;
  image?: {
    src: string;
    alt?: string;
  } | null;
  hasTemplate?: boolean;
  templateInfo?: {
    template_name: string;
    deployment_status: string;
    test_url: string;
    created_at: string;
  } | null;
}

interface TemplateStore {
  // State
  quota: QuotaInfo | null;
  templates: TemplateUsage[];
  products: Product[];
  isLoading: boolean;
  isGenerating: string | null;
  error: string | null;

  // Actions
  fetchQuotaAndTemplates: (shop: string) => Promise<void>;
  fetchProducts: (shop: string) => Promise<void>;
  generateTemplate: (shop: string, productId: string, productHandle: string) => Promise<boolean>;
  deleteTemplate: (shop: string, templateId: string) => Promise<boolean>;
  setGenerating: (productId: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  // Initial state
  quota: null,
  templates: [],
  products: [],
  isLoading: false,
  isGenerating: null,
  error: null,

  // Actions
  fetchQuotaAndTemplates: async (shop: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(TEMPLATE_API.getQuota(shop));
      const data = await response.json();
      
      if (data.success) {
        set({ 
          quota: data.data.quota,
          templates: data.data.templates,
          isLoading: false 
        });
      } else {
        set({ error: data.error || 'Failed to fetch data', isLoading: false });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Network error',
        isLoading: false 
      });
    }
  },

  fetchProducts: async (shop: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log(`🔍 Fetching products for shop: ${shop}`);
      
      const response = await fetch(TEMPLATE_API.getProducts(shop));
      const data = await response.json();
      
      if (data.success) {
        const products = data.data.map((product: any) => ({
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          product_type: product.product_type,
          vendor: product.vendor,
          tags: product.tags,
          image: product.image,
          hasTemplate: product.hasTemplate,
          templateInfo: product.templateInfo
        }));
        
        console.log(`✅ Successfully fetched ${products.length} products`);
        set({ products, isLoading: false });
      } else {
        set({ 
          error: data.error || 'Failed to fetch products',
          isLoading: false,
          products: []
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch products',
        isLoading: false,
        products: []
      });
    }
  },

  generateTemplate: async (shop: string, productId: string, productHandle: string) => {
    const { quota } = get();
    
    if (!quota || quota.quota_exceeded) {
      set({ error: 'Quota exceeded' });
      return false;
    }
    
    set({ isGenerating: productId, error: null });
    
    try {
      const response = await fetch(TEMPLATE_API.generateTemplate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          product_gid: productId,
          product_handle: productHandle
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh data after successful generation
        await get().fetchQuotaAndTemplates(shop);
        set({ isGenerating: null });
        return true;
      } else {
        set({ 
          error: data.error || 'Template generation failed',
          isGenerating: null 
        });
        return false;
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Network error',
        isGenerating: null 
      });
      return false;
    }
  },

  deleteTemplate: async (shop: string, templateId: string) => {
    try {
      const response = await fetch(TEMPLATE_API.deleteTemplate(templateId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop })
      });
      
      if (response.ok) {
        // Refresh data after deletion
        await get().fetchQuotaAndTemplates(shop);
        return true;
      } else {
        set({ error: 'Failed to delete template' });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Network error' });
      return false;
    }
  },

  setGenerating: (productId: string | null) => {
    set({ isGenerating: productId });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    set({
      quota: null,
      templates: [],
      products: [],
      isLoading: false,
      isGenerating: null,
      error: null
    });
  }
}));