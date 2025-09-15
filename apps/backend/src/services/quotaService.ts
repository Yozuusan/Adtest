import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface QuotaInfo {
  plan_type: string;
  templates_limit: number;
  templates_used: number;
  templates_remaining: number;
  quota_exceeded: boolean;
}

export interface TemplateUsageRecord {
  id?: string;
  shop_domain: string;
  template_name: string;
  product_gid: string;
  product_handle: string;
  template_style?: string;
  theme_fingerprint?: string;
  shopify_template_key: string;
  deployment_status?: string;
  confidence_avg?: number;
  mapping_elements?: number;
  test_url?: string;
  is_active?: boolean;
  deployed_at?: string;
  created_at?: string;
  updated_at?: string;
}

class QuotaService {
  /**
   * Vérifier le quota disponible pour une boutique
   */
  async checkQuota(shopDomain: string): Promise<QuotaInfo> {
    try {
      const { data, error } = await supabase.rpc('check_template_quota', {
        p_shop_domain: shopDomain
      });

      if (error) {
        console.error('Error checking quota:', error);
        // Retourner un quota par défaut en cas d'erreur
        return {
          plan_type: 'basic',
          templates_limit: 1,
          templates_used: 0,
          templates_remaining: 1,
          quota_exceeded: false
        };
      }

      return data[0] || {
        plan_type: 'basic',
        templates_limit: 1,
        templates_used: 0,
        templates_remaining: 1,
        quota_exceeded: false
      };
    } catch (error) {
      console.error('Error in checkQuota:', error);
      throw error;
    }
  }

  /**
   * Incrémenter l'usage des templates
   */
  async incrementUsage(shopDomain: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('increment_template_usage', {
        p_shop_domain: shopDomain
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
      return false;
    }
  }

  /**
   * Enregistrer un nouveau template utilisé
   */
  async recordTemplateUsage(templateData: TemplateUsageRecord): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('template_usage')
        .insert({
          shop_domain: templateData.shop_domain,
          template_name: templateData.template_name,
          product_gid: templateData.product_gid,
          product_handle: templateData.product_handle,
          template_style: templateData.template_style || 'auto-generated',
          theme_fingerprint: templateData.theme_fingerprint,
          shopify_template_key: templateData.shopify_template_key,
          deployment_status: templateData.deployment_status || 'deployed',
          confidence_avg: templateData.confidence_avg,
          mapping_elements: templateData.mapping_elements,
          test_url: templateData.test_url,
          deployed_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error recording template usage:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in recordTemplateUsage:', error);
      return null;
    }
  }

  /**
   * Lister les templates utilisés par une boutique
   */
  async getTemplateUsage(shopDomain: string, activeOnly: boolean = true): Promise<TemplateUsageRecord[]> {
    try {
      let query = supabase
        .from('template_usage')
        .select('*')
        .eq('shop_domain', shopDomain)
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting template usage:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplateUsage:', error);
      return [];
    }
  }

  /**
   * Vérifier si un produit a déjà un template
   */
  async hasProductTemplate(shopDomain: string, productGid: string): Promise<TemplateUsageRecord | null> {
    try {
      const { data, error } = await supabase
        .from('template_usage')
        .select('*')
        .eq('shop_domain', shopDomain)
        .eq('product_gid', productGid)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error checking product template:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in hasProductTemplate:', error);
      return null;
    }
  }

  /**
   * Mettre à jour le plan d'un utilisateur
   */
  async updateUserPlan(shopDomain: string, planType: string): Promise<boolean> {
    try {
      const planLimits = {
        'basic': 1,
        'pro': 5,
        'business': 20,
        'enterprise': 999
      };

      const { error } = await supabase
        .from('user_plans')
        .upsert({
          shop_domain: shopDomain,
          plan_type: planType,
          templates_limit: planLimits[planType as keyof typeof planLimits] || 1,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating user plan:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserPlan:', error);
      return false;
    }
  }

  /**
   * Désactiver un template (suppression logique)
   */
  async deactivateTemplate(shopDomain: string, templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('template_usage')
        .update({ 
          is_active: false,
          deployment_status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('shop_domain', shopDomain)
        .eq('id', templateId);

      if (error) {
        console.error('Error deactivating template:', error);
        return false;
      }

      // Décrémenter le compteur d'usage
      await supabase
        .from('user_plans')
        .update({ templates_used: Math.max(0, await this.getCurrentUsageCount(shopDomain) - 1) })
        .eq('shop_domain', shopDomain);

      return true;
    } catch (error) {
      console.error('Error in deactivateTemplate:', error);
      return false;
    }
  }

  /**
   * Compter l'usage actuel d'une boutique
   */
  private async getCurrentUsageCount(shopDomain: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('template_usage')
        .select('*', { count: 'exact', head: true })
        .eq('shop_domain', shopDomain)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting usage count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getCurrentUsageCount:', error);
      return 0;
    }
  }

  /**
   * Obtenir les statistiques d'un template
   */
  async getTemplateStats(templateId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('template_analytics')
        .select('metric_type, metric_value, timestamp')
        .eq('template_usage_id', templateId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error getting template stats:', error);
        return { views: 0, clicks: 0, conversions: 0 };
      }

      // Agrégation simple des métriques
      const stats = data.reduce((acc: Record<string, number>, row) => {
        if (!acc[row.metric_type]) acc[row.metric_type] = 0;
        acc[row.metric_type] += row.metric_value;
        return acc;
      }, {});

      return {
        views: stats['view'] || 0,
        clicks: stats['click'] || 0,
        conversions: stats['conversion'] || 0,
        add_to_cart: stats['add_to_cart'] || 0
      };
    } catch (error) {
      console.error('Error in getTemplateStats:', error);
      return { views: 0, clicks: 0, conversions: 0 };
    }
  }
}

export const quotaService = new QuotaService();