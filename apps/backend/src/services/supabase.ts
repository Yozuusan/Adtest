/**
 * Service Supabase pour la gestion de la base de données
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvVar } from '../utils/env-validation';

// Types pour les tables Supabase
export interface SupabaseShop {
  id: string;
  shop_domain: string; // Changé de 'domain' à 'shop_domain'
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
  shop: string; // Changé de 'shop_domain' à 'shop'
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
  shop_id: string; // Changé de 'shop_domain' à 'shop_id'
  product_url?: string;
  product_gid?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'running';
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
  shop_id: string; // Changé de 'shop_domain' à 'shop_id'
  theme_id?: string;
  theme_name?: string;
  theme_fingerprint: string;
  selectors: any; // Changé de 'adapter_data' à 'selectors'
  confidence: any; // Changé de 'confidence_score' à 'confidence'
  created_at: string;
  updated_at: string;
}

export interface SupabaseAdlignVariant {
  id: string;
  shop: string; // Changé de 'shop_domain' à 'shop'
  product_gid: string;
  variant_handle: string;
  content_json: any; // Changé de 'variant_data' à 'content_json'
  campaign_ref?: string;
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
    try {
      const { data, error } = await this.client
        .from('shops')
        .upsert({
          shop_domain: shopData.shop_domain,
          access_token: shopData.access_token,
          scope: shopData.scope,
          shop_owner: shopData.shop_owner,
          email: shopData.email,
          country_code: shopData.country_code,
          currency: shopData.currency,
          timezone: shopData.timezone,
          expires_at: shopData.expires_at,
          is_active: shopData.is_active
        }, {
          onConflict: 'shop_domain'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error upserting shop:', error);
      throw error;
    }
  }

  /**
   * Récupérer une boutique par son domaine
   */
  async getShopByDomain(domain: string): Promise<SupabaseShop | null> {
    try {
      const { data, error } = await this.client
        .from('shops')
        .select('*')
        .eq('shop_domain', domain)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Error getting shop by domain:', error);
      return null;
    }
  }

  /**
   * Mettre à jour le token d'une boutique
   */
  async updateShopToken(domain: string, accessToken: string, scope?: string, expiresAt?: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('shops')
        .update({
          access_token: accessToken,
          scope,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('shop_domain', domain);

      if (error) throw error;
      console.log(`✅ Shop token updated for ${domain}`);
    } catch (error) {
      console.error('❌ Error updating shop token:', error);
      throw error;
    }
  }

  // ========================================
  // ANALYTICS EVENTS
  // ========================================

  /**
   * Sauvegarder un événement analytics
   */
  async saveAnalyticsEvent(event: Omit<SupabaseAnalyticsEvent, 'id' | 'created_at'>): Promise<SupabaseAnalyticsEvent> {
    try {
      const { data, error } = await this.client
        .from('analytics_events')
        .insert({
          shop: event.shop,
          event_type: event.event_type,
          variant_handle: event.variant_handle,
          product_gid: event.product_gid,
          campaign_ref: event.campaign_ref,
          user_agent: event.user_agent,
          ip_address: event.ip_address,
          timestamp: event.timestamp,
          metadata: event.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error saving analytics event:', error);
      throw new Error(`Failed to save analytics event: ${error}`);
    }
  }

  /**
   * Récupérer les statistiques analytics d'une boutique
   */
  async getAnalyticsStats(shopDomain: string, startDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('analytics_events')
        .select('*')
        .eq('shop', shopDomain)
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting analytics stats:', error);
      return [];
    }
  }

  // ========================================
  // MAPPING JOBS
  // ========================================

  /**
   * Créer un job de mapping
   */
  async createMappingJob(job: Omit<SupabaseMappingJob, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseMappingJob> {
    try {
      const { data, error } = await this.client
        .from('mapping_jobs')
        .insert({
          shop_id: job.shop_id,
          product_url: job.product_url,
          product_gid: job.product_gid,
          status: job.status,
          priority: job.priority,
          estimated_duration: job.estimated_duration,
          result: job.result,
          error: job.error
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating mapping job:', error);
      throw new Error(`Failed to create mapping job: ${error}`);
    }
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
   * Récupérer les jobs de mapping d'une boutique
   */
  async getShopMappingJobs(shopDomain: string, status?: string, limit: number = 50, offset: number = 0): Promise<{
    jobs: SupabaseMappingJob[];
    total: number;
  }> {
    try {
      let query = this.client
        .from('mapping_jobs')
        .select('*', { count: 'exact' })
        .eq('shop_id', shopDomain);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        jobs: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('❌ Error getting shop mapping jobs:', error);
      return { jobs: [], total: 0 };
    }
  }

  // ========================================
  // THEME ADAPTERS
  // ========================================

  /**
   * Sauvegarder un adapter de thème
   */
  async saveThemeAdapter(adapter: Omit<SupabaseThemeAdapter, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseThemeAdapter> {
    try {
      const { data, error } = await this.client
        .from('theme_adapters')
        .upsert({
          shop_id: adapter.shop_id,
          theme_id: adapter.theme_id,
          theme_name: adapter.theme_name,
          theme_fingerprint: adapter.theme_fingerprint,
          selectors: adapter.selectors,
          confidence: adapter.confidence
        }, {
          onConflict: 'theme_fingerprint'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error saving theme adapter:', error);
      throw new Error(`Failed to save theme adapter: ${error}`);
    }
  }

  /**
   * Récupérer un adapter de thème par fingerprint
   */
  async getThemeAdapter(fingerprint: string): Promise<SupabaseThemeAdapter | null> {
    try {
      const { data, error } = await this.client
        .from('theme_adapters')
        .select('*')
        .eq('theme_fingerprint', fingerprint)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Error getting theme adapter:', error);
      return null;
    }
  }

  // ========================================
  // ADLIGN VARIANTS MANAGEMENT
  // ========================================

  /**
   * Sauvegarder une variante Adlign
   */
  async saveAdlignVariant(variant: Omit<SupabaseAdlignVariant, "id" | "created_at" | "updated_at">): Promise<SupabaseAdlignVariant> {
    try {
      const { data, error } = await this.client
        .from('adlign_variants')
        .insert(variant)
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving Adlign variant:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in saveAdlignVariant:', error);
      throw error;
    }
  }

  // ========================================
  // BRAND ANALYSIS MANAGEMENT
  // ========================================

  /**
   * Récupérer l'analyse de marque existante
   */
  async getBrandAnalysis(shop: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('brand_analysis')
        .select('*')
        .eq('shop', shop)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching brand analysis:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getBrandAnalysis:', error);
      return null;
    }
  }

  /**
   * Sauvegarder une analyse de marque
   */
  async saveBrandAnalysis(analysis: {
    shop: string;
    ai_analysis: any;
    custom_brand_info?: any;
    analysis_type?: string;
    confidence_score?: number;
    products_analyzed: number;
  }): Promise<any> {
    try {
      // Utiliser upsert pour éviter les conflits de contrainte unique
      const { data, error } = await this.client
        .from('brand_analysis')
        .upsert(analysis, { 
          onConflict: 'shop',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving brand analysis:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in saveBrandAnalysis:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les informations manuelles de marque
   */
  async updateCustomBrandInfo(shop: string, customInfo: any): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('brand_analysis')
        .upsert({
          shop,
          custom_brand_info: customInfo,
          analysis_type: 'hybrid',
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'shop',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating custom brand info:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in updateCustomBrandInfo:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les variantes d'un produit
   */
  async getProductVariants(shopDomain: string, productGid: string): Promise<SupabaseAdlignVariant[]> {
    try {
      const { data, error } = await this.client
        .from('adlign_variants')
        .select('*')
        .eq('shop', shopDomain)
        .eq('product_gid', productGid)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting product variants:', error);
      return [];
    }
  }

  /**
   * Supprimer une variante
   */
  async deleteVariant(shopDomain: string, productGid: string, variantHandle: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('adlign_variants')
        .delete()
        .eq('shop', shopDomain)
        .eq('product_gid', productGid)
        .eq('variant_handle', variantHandle);

      if (error) throw error;
      console.log(`✅ Variant deleted: ${variantHandle}`);
    } catch (error) {
      console.error('❌ Error deleting variant:', error);
      throw new Error(`Failed to delete variant: ${error}`);
    }
  }

  // ========================================
  // USER-SHOP ASSOCIATIONS
  // ========================================

  /**
   * Créer une association utilisateur-boutique
   */
  async createUserShopAssociation(userId: string, shopId: string, role: 'owner' | 'admin' | 'viewer' = 'owner'): Promise<void> {
    try {
      const { error } = await this.client
        .from('user_shops')
        .insert({
          user_id: userId,
          shop_id: shopId,
          role
        });

      if (error) {
        // Si l'association existe déjà, on l'ignore
        if (error.code === '23505') { // unique_violation
          console.log(`ℹ️ User-shop association already exists for user ${userId} and shop ${shopId}`);
          return;
        }
        throw error;
      }
      
      console.log(`✅ Created user-shop association: user ${userId} -> shop ${shopId} (${role})`);
    } catch (error) {
      console.error('❌ Error creating user-shop association:', error);
      throw error;
    }
  }

  /**
   * Récupérer les boutiques d'un utilisateur
   */
  async getUserShops(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('user_shops')
        .select(`
          id,
          user_id,
          shop_id,
          role,
          created_at,
          updated_at,
          shop:shops!inner (
            id,
            shop_domain,
            shop_owner,
            email,
            country_code,
            currency,
            timezone,
            created_at,
            updated_at,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('shop.is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting user shops:', error);
      return [];
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
