// Types locaux pour le backend Adlign
// Remplace les imports @adlign/types cassés

export interface AnalyticsEvent {
  id: string;
  event_type: 'variant_view' | 'cta_click' | 'conversion' | 'page_view';
  shop: string;
  variant_handle?: string;
  product_gid?: string;
  campaign_ref?: string;
  user_agent?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AdlignVariant {
  id: string;
  product_id: string;
  variant_handle: string;
  content_json: Record<string, any>;
  shop: string;
  campaign_ref?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MappingJob {
  id: string;
  shop_id: string;
  product_handle?: string;
  product_url?: string;
  product_gid?: string;
  theme_id?: string;
  priority?: 'low' | 'normal' | 'high';
  options?: {
    extract_images?: boolean;
    extract_usp?: boolean;
    extract_badges?: boolean;
    confidence_threshold?: number;
  };
  status: 'pending' | 'processing' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: ThemeAdapter;
}

export interface ShopToken {
  access_token: string;
  scope: string;
  expires_in?: number;
}

export interface Product {
  id: string;
  gid: string;
  title: string;
  handle: string;
  status: string;
  product_type?: string;
  vendor?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  product_url: string;
}

export interface BrandAnalysis {
  id: string;
  shop: string;
  ai_analysis: Record<string, any>;
  custom_brand_info?: Record<string, any>;
  analysis_type?: 'automatic' | 'manual' | 'hybrid';
  confidence_score?: number;
  products_analyzed?: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface ThemeAdapter {
  id: string;
  shop_id: string;
  theme_id?: string;
  theme_name?: string;
  theme_fingerprint?: string;
  selectors: Record<string, any>;
  confidence?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
