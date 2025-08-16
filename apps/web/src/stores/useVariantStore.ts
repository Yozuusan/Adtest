import { create } from 'zustand';
import { Variant, Product, Creative, DashboardStats } from '@/types';

interface VariantStore {
  // State
  variants: Variant[];
  products: Product[];
  selectedProduct: Product | null;
  selectedCreative: Creative | null;
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setVariants: (variants: Variant[]) => void;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setSelectedCreative: (creative: Creative | null) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addVariant: (variant: Variant) => void;
  updateVariant: (id: string, updates: Partial<Variant>) => void;
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
};

export const useVariantStore = create<VariantStore>((set) => ({
  ...initialState,

  setVariants: (variants) => set({ variants }),
  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setSelectedCreative: (selectedCreative) => set({ selectedCreative }),
  setDashboardStats: (dashboardStats) => set({ dashboardStats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addVariant: (variant) =>
    set((state) => ({
      variants: [variant, ...state.variants],
    })),

  updateVariant: (id, updates) =>
    set((state) => ({
      variants: state.variants.map((variant) =>
        variant.id === id ? { ...variant, ...updates } : variant
      ),
    })),

  removeVariant: (id) =>
    set((state) => ({
      variants: state.variants.filter((variant) => variant.id !== id),
    })),

  reset: () => set(initialState),
}));