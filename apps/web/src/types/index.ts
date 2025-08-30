export interface Product {
  id: string;
  gid: string;
  title: string;
  handle: string;
  status: 'active' | 'draft' | 'archived';
  product_type: string;
  vendor: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  product_url: string;
}

export interface Variant {
  id: string;
  variant_handle: string;
  product_id: string;
  product_title: string;
  campaign_context?: string;
  tone_of_voice?: string;
  target_audience?: string;
  status: 'active' | 'draft' | 'paused';
  created_at: string;
  updated_at: string;
  analytics?: VariantAnalytics;
}

export interface VariantAnalytics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  cpc: number;
  roas: number;
}

export interface Creative {
  id: string;
  file: File;
  preview_url: string;
  extracted_text?: string;
  file_type: string;
  file_size: number;
}

export interface BrandAnalysis {
  shop: string;
  voice_analysis: string;
  key_products: string[];
  target_audience: string;
  communication_style: string;
  summary: string;
  confidence_score: number;
  created_at: string;
}

export interface DashboardStats {
  total_variants: number;
  active_campaigns: number;
  avg_conversion_rate: number;
  total_revenue_impact: number;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
}

export interface ChartData {
  date: string;
  conversion_rate: number;
  revenue: number;
  impressions: number;
}

export type ToneOfVoice = 
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'urgent'
  | 'luxurious'
  | 'playful'
  | 'authoritative'
  | 'empathetic';

export interface NewVariantFormData {
  product_id: string;
  creative_file?: File;
  campaign_context: string;
  tone_of_voice: ToneOfVoice;
  target_audience: string;
  variant_handle: string;
}