/**
 * Service Supabase pour la gestion de la base de données
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvVar } from '../utils/env-validation';

// Types pour les tables Supabase
export interface SupabaseShop {
  id: string;
  domain: string;
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

export interface SupabaseAnalyticsEvent {
  id: string;
  shop_domain: string;
  event_type: string;
  variant_handle?: string;
  product_gid?: string;
  campaign_ref?: string;
  user_agent?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: any;
  created_at: string;
}

export interface SupabaseMappingJob {
  id: string;
  shop_domain: string;
  product_url?: string;
  product_gid?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  estimated_duration?: string;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface SupabaseThemeAdapter {
  id: string;
  shop_domain: string;
  theme_id?: string;
  theme_name?: string;
  theme_fingerprint: string;
  adapter_data: any;
  confidence_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAdlignVariant {
  id: string;
  shop_domain: string;
  product_gid: string;
  variant_handle: string;
  variant_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseService {
  private client: SupabaseClient;
  private supabaseUrl: string;
  private serviceRoleKey: string;

  constructor() {
    this.supabaseUrl = getEnvVar('SUPABASE_URL');
    this.serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    
    this.client = createClient(this.supabaseUrl, this.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase service initialized');
  }

  // ========================================
  // SHOPS MANAGEMENT
  // ========================================

  /**
   * Créer ou mettre à jour une boutique
   */
  async upsertShop(shopData: Omit<SupabaseShop, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseShop> {
    const { data, error } = await this.client
      .from('shops')
      .upsert(shopData, { onConflict: 'domain' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error upserting shop:', error);
      throw new Error(`Failed to upsert shop: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer une boutique par son domaine
   */
  async getShopByDomain(domain: string): Promise<SupabaseShop | null> {
    const { data, error } = await this.client
      .from('shops')
      .select('*')
      .eq('domain', domain)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error getting shop:', error);
      throw new Error(`Failed to get shop: ${error.message}`);
    }

    return data;
  }

  /**
   * Mettre à jour le token d'une boutique
   */
  async updateShopToken(domain: string, accessToken: string, scope?: string, expiresAt?: string): Promise<void> {
    const { error } = await this.client
      .from('shops')
      .update({
        access_token: accessToken,
        scope,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('domain', domain);

    if (error) {
      console.error('❌ Error updating shop token:', error);
      throw new Error(`Failed to update shop token: ${error.message}`);
    }
  }

  // ========================================
  // ANALYTICS EVENTS
  // ========================================

  /**
   * Sauvegarder un événement analytics
   */
  async saveAnalyticsEvent(event: Omit<SupabaseAnalyticsEvent, 'id' | 'created_at'>): Promise<SupabaseAnalyticsEvent> {
    const { data, error } = await this.client
      .from('analytics_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving analytics event:', error);
      throw new Error(`Failed to save analytics event: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer les statistiques d'une boutique
   */
  async getAnalyticsStats(shopDomain: string, startDate: string): Promise<any> {
    const { data, error } = await this.client
      .from('analytics_events')
      .select('*')
      .eq('shop_domain', shopDomain)
      .gte('timestamp', startDate);

    if (error) {
      console.error('❌ Error getting analytics stats:', error);
      throw new Error(`Failed to get analytics stats: ${error.message}`);
    }

    return data;
  }

  // ========================================
  // MAPPING JOBS
  // ========================================

  /**
   * Créer un job de mapping
   */
  async createMappingJob(job: Omit<SupabaseMappingJob, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseMappingJob> {
    const { data, error } = await this.client
      .from('mapping_jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating mapping job:', error);
      throw new Error(`Failed to create mapping job: ${error.message}`);
    }

    return data;
  }

  /**
   * Mettre à jour le statut d'un job
   */
  async updateMappingJobStatus(jobId: string, status: SupabaseMappingJob['status'], result?: any, error?: string): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'processing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (result) updateData.result = result;
    if (error) updateData.error = error;

    const { error: updateError } = await this.client
      .from('mapping_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      console.error('❌ Error updating mapping job status:', updateError);
      throw new Error(`Failed to update mapping job status: ${updateError.message}`);
    }
  }

  /**
   * Récupérer un job de mapping par son ID
   */
  async getMappingJobById(jobId: string): Promise<SupabaseMappingJob | null> {
    const { data, error } = await this.client
      .from('mapping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error getting mapping job by ID:', error);
      throw new Error(`Failed to get mapping job: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer les jobs d'une boutique
   */
  async getShopMappingJobs(shopDomain: string, status?: string, limit: number = 50, offset: number = 0): Promise<{
    jobs: SupabaseMappingJob[];
    total: number;
  }> {
    let query = this.client
      .from('mapping_jobs')
      .select('*', { count: 'exact' })
      .eq('shop_domain', shopDomain);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error getting mapping jobs:', error);
      throw new Error(`Failed to get mapping jobs: ${error.message}`);
    }

    return {
      jobs: data || [],
      total: count || 0
    };
  }

  // ========================================
  // THEME ADAPTERS
  // ========================================

  /**
   * Sauvegarder un adapter de thème
   */
  async saveThemeAdapter(adapter: Omit<SupabaseThemeAdapter, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseThemeAdapter> {
    const { data, error } = await this.client
      .from('theme_adapters')
      .upsert(adapter, { onConflict: 'theme_fingerprint' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving theme adapter:', error);
      throw new Error(`Failed to save theme adapter: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer un adapter de thème par fingerprint
   */
  async getThemeAdapter(fingerprint: string): Promise<SupabaseThemeAdapter | null> {
    const { data, error } = await this.client
      .from('theme_adapters')
      .select('*')
      .eq('theme_fingerprint', fingerprint)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error getting theme adapter:', error);
      throw new Error(`Failed to get theme adapter: ${error.message}`);
    }

    return data;
  }

  // ========================================
  // ADLIGN VARIANTS
  // ========================================

  /**
   * Sauvegarder une variante Adlign
   */
  async saveAdlignVariant(variant: Omit<SupabaseAdlignVariant, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseAdlignVariant> {
    const { data, error } = await this.client
      .from('adlign_variants')
      .upsert(variant, { onConflict: 'shop_domain,product_gid,variant_handle' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving Adlign variant:', error);
      throw new Error(`Failed to save Adlign variant: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer toutes les variantes d'un produit
   */
  async getProductVariants(shopDomain: string, productGid: string): Promise<SupabaseAdlignVariant[]> {
    const { data, error } = await this.client
      .from('adlign_variants')
      .select('*')
      .eq('shop_domain', shopDomain)
      .eq('product_gid', productGid)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error getting product variants:', error);
      throw new Error(`Failed to get product variants: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Supprimer une variante
   */
  async deleteVariant(shopDomain: string, productGid: string, variantHandle: string): Promise<void> {
    const { error } = await this.client
      .from('adlign_variants')
      .delete()
      .eq('shop_domain', shopDomain)
      .eq('product_gid', productGid)
      .eq('variant_handle', variantHandle);

    if (error) {
      console.error('❌ Error deleting variant:', error);
      throw new Error(`Failed to delete variant: ${error.message}`);
    }
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  /**
   * Tester la connexion à Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('shops')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }

      console.log('✅ Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return false;
    }
  }

  /**
   * Fermer la connexion
   */
  async close(): Promise<void> {
    // Supabase client n'a pas de méthode close()
    console.log('ℹ️ Supabase service closed');
  }
}

// Instance singleton
export const supabaseService = new SupabaseService();
