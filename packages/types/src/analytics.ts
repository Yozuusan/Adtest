export interface AnalyticsEvent {
  id: string;
  event_type: 'variant_view' | 'variant_click' | 'variant_conversion';
  variant_id: string;
  product_gid: string;
  campaign_ref: string;
  user_agent?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface VariantPerformance {
  variant_id: string;
  views: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
  revenue: number;
  period: 'day' | 'week' | 'month';
  start_date: string;
  end_date: string;
}
