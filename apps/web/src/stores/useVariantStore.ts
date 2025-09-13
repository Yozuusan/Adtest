import { create } from 'zustand';
import { Variant, Product, Creative, DashboardStats } from '@/types';
import { apiService } from '@/services/api';

interface VariantStore {
  // State
  variants: Variant[];
  products: Product[];
  selectedProduct: Product | null;
  selectedCreative: Creative | null;
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  currentShop: string | null;

  // Actions
  setVariants: (variants: Variant[]) => void;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setSelectedCreative: (creative: Creative | null) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentShop: (shop: string | null) => void;
  
  // API Actions
  fetchProducts: (shop: string, search?: string) => Promise<void>;
  fetchVariants: (shop: string) => Promise<void>;
  fetchAnalytics: (shop: string, period?: string) => Promise<void>;
  createVariant: (variantData: any) => Promise<void>;
  updateVariant: (id: string, updates: Partial<Variant>) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;
  
  // Local Actions
  addVariant: (variant: Variant) => void;
  removeVariant: (id: string) => void;
  reset: () => void;
}

const initialState = {
  variants: [],
  products: [],
  selectedProduct: null,
  selectedCreative: null,
  dashboardStats: null,
  isLoading: false,
  error: null,
  currentShop: null,
};

export const useVariantStore = create<VariantStore>((set, get) => ({
  ...initialState,

  // Setters
  setVariants: (variants) => set({ variants }),
  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setSelectedCreative: (selectedCreative) => set({ selectedCreative }),
  setDashboardStats: (dashboardStats) => set({ dashboardStats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCurrentShop: (currentShop) => set({ currentShop }),

  // API Actions
  fetchProducts: async (shop: string, search?: string) => {
    try {
      console.log('🔄 useVariantStore.fetchProducts called with:', { shop, search });
      set({ isLoading: true, error: null });
      const products = await apiService.getProducts(shop, search);
      console.log('✅ Products fetched successfully:', { count: products.length, products });
      set({ products, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch products',
        isLoading: false 
      });
    }
  },

  fetchVariants: async (shop: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiService.getVariants(shop);
      
      // Handle different response formats - defensive programming
      let variants: Variant[] = [];
      if (Array.isArray(response)) {
        variants = response;
      } else if (response?.data && Array.isArray(response.data)) {
        variants = response.data;
      } else if (response?.variants && Array.isArray(response.variants)) {
        variants = response.variants;
      } else {
        console.warn('⚠️ Unexpected variants response format:', response);
        variants = [];
      }
      
      set({ variants, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching variants:', error);
      set({ 
        variants: [], // Ensure variants is always an array
        error: error instanceof Error ? error.message : 'Failed to fetch variants',
        isLoading: false 
      });
    }
  },

  fetchAnalytics: async (shop: string, period = '7d') => {
    try {
      set({ isLoading: true, error: null });
      const stats = await apiService.getAnalyticsStats(shop, period);
      set({ dashboardStats: stats, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
        isLoading: false 
      });
    }
  },

  createVariant: async (variantData: any) => {
    try {
      set({ isLoading: true, error: null });
      const newVariant = await apiService.createVariant(variantData);
      set((state) => ({
        variants: [newVariant, ...state.variants],
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create variant',
        isLoading: false 
      });
    }
  },

  updateVariant: async (id: string, updates: Partial<Variant>) => {
    try {
      set({ isLoading: true, error: null });
      const updatedVariant = await apiService.updateVariant(id, updates);
      set((state) => ({
        variants: state.variants.map((variant) =>
          variant.id === id ? { ...variant, ...updatedVariant } : variant
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update variant',
        isLoading: false 
      });
    }
  },

  deleteVariant: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await apiService.deleteVariant(id, get().currentShop || '');
      set((state) => ({
        variants: state.variants.filter((variant) => variant.id !== id),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete variant',
        isLoading: false 
      });
    }
  },

  // Local Actions
  addVariant: (variant) =>
    set((state) => ({
      variants: [variant, ...(Array.isArray(state.variants) ? state.variants : [])],
    })),

  removeVariant: (id) =>
    set((state) => ({
      variants: state.variants.filter((variant) => variant.id !== id),
    })),

  reset: () => set(initialState),
}));