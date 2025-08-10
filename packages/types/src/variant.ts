export interface VariantPayload {
  meta: {
    product_gid: string;
    campaign_ref: string;
    created_at: string;
    expires_at?: string;
  };
  slots: {
    [key: string]: VariantSlot;
  };
}

export interface VariantSlot {
  type: 'text' | 'image' | 'cta' | 'usp' | 'badge';
  value: string;
  src?: string;
  w?: number;
  h?: number;
  priority?: number;
}

export interface VariantMeta {
  id: string;
  product_gid: string;
  campaign_ref: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
  expires_at?: string;
}
