import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hyglnwkdthdewhqeqqss.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Z2xud2tkdGhkZXdocWVxcXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MjYyMzQsImV4cCI6MjA3MDIwMjIzNH0.uOfeGxOk9oXul9u_EbnArCaIDnPJ-UBquFQeb9Z9m2M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour les tables
export interface UserShop {
  id: string;
  user_id: string;
  shop_id: string;
  role: 'owner' | 'admin' | 'viewer';
  created_at: string;
  updated_at: string;
  shop?: Shop;
}

// Type pour la requête avec relation
export interface UserShopWithShop extends Omit<UserShop, 'shop'> {
  shop: Shop;
}

export interface Shop {
  id: string;
  shop_domain: string;
  access_token: string;
  scope?: string;
  shop_owner?: string;
  email?: string;
  country_code?: string;
  currency?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  is_active: boolean;
}