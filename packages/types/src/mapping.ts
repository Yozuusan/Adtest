export interface ThemeAdapter {
  id: string;
  theme_id: string;
  product_handle: string;
  selectors: ElementSelector[];
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface ElementSelector {
  key: string;
  selector: string;
  type: 'text' | 'image' | 'cta' | 'usp' | 'badge';
  fallback_selector?: string;
  confidence_score: number;
  order: number;
  attributes?: {
    [key: string]: string;
  };
}

export interface MappingJob {
  id: string;
  product_handle: string;
  theme_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: ThemeAdapter;
}
