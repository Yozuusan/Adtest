import { createClient } from '@supabase/supabase-js';

// Configuration Supabase optionnelle pour éviter les crashes de démarrage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

console.log('🔧 QuotaService:', supabase ? 'Supabase connecté' : 'Mode fallback (sans Supabase)');

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
  shopify_template_key?: string;
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
      // Si Supabase n'est pas disponible, retourner un quota par défaut
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - quota basic par défaut');
        return {
          plan_type: 'basic',
          templates_limit: 1,
          templates_used: 0,
          templates_remaining: 1,
          quota_exceeded: false
        };
      }

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
      return {
        plan_type: 'basic',
        templates_limit: 1,
        templates_used: 0,
        templates_remaining: 1,
        quota_exceeded: false
      };
    }
  }

  /**
   * Incrémenter l'usage des templates
   */
  async incrementUsage(shopDomain: string): Promise<boolean> {
    try {
      // Si Supabase n'est pas disponible, simuler un succès
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - increment usage simulé');
        return true;
      }

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
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - template usage simulé');
        return 'fallback-' + Date.now();
      }

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
   * Récupérer la liste des templates pour une boutique
   */
  async getTemplatesList(shopDomain: string): Promise<TemplateUsageRecord[]> {
    try {
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - templates list vide');
        return [];
      }

      const { data, error } = await supabase
        .from('template_usage')
        .select('*')
        .eq('shop_domain', shopDomain)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates list:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplatesList:', error);
      return [];
    }
  }

  /**
   * Obtenir les quotas et templates pour une boutique (méthode combinée)
   */
  async getQuotaAndTemplates(shopDomain: string): Promise<{quota: QuotaInfo, templates: TemplateUsageRecord[]}> {
    try {
      const [quota, templates] = await Promise.all([
        this.checkQuota(shopDomain),
        this.getTemplatesList(shopDomain)
      ]);

      return { quota, templates };
    } catch (error) {
      console.error('Error in getQuotaAndTemplates:', error);
      return {
        quota: {
          plan_type: 'basic',
          templates_limit: 1,
          templates_used: 0,
          templates_remaining: 1,
          quota_exceeded: false
        },
        templates: []
      };
    }
  }

  /**
   * Désactiver un template (soft delete)
   */
  async deactivateTemplate(templateId: string, shopDomain: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - deactivate template simulé');
        return true;
      }

      const { error } = await supabase
        .from('template_usage')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('shop_domain', shopDomain);

      if (error) {
        console.error('Error deactivating template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deactivateTemplate:', error);
      return false;
    }
  }

  /**
   * Mettre à jour le statut de déploiement d'un template
   */
  async updateTemplateStatus(templateId: string, status: string, testUrl?: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - update template status simulé');
        return true;
      }

      const updateData: any = {
        deployment_status: status,
        updated_at: new Date().toISOString()
      };

      if (testUrl) {
        updateData.test_url = testUrl;
      }

      if (status === 'deployed') {
        updateData.deployed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('template_usage')
        .update(updateData)
        .eq('id', templateId);

      if (error) {
        console.error('Error updating template status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTemplateStatus:', error);
      return false;
    }
  }

  /**
   * Vérifier si une boutique peut générer un nouveau template
   */
  async canGenerateTemplate(shopDomain: string): Promise<boolean> {
    try {
      const quota = await this.checkQuota(shopDomain);
      return !quota.quota_exceeded && quota.templates_remaining > 0;
    } catch (error) {
      console.error('Error in canGenerateTemplate:', error);
      // En cas d'erreur, autoriser par défaut
      return true;
    }
  }

  /**
   * Vérifier si un produit a déjà un template
   */
  async hasProductTemplate(shopDomain: string, productGid: string): Promise<TemplateUsageRecord | null> {
    try {
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - hasProductTemplate retourne null');
        return null;
      }

      const { data, error } = await supabase
        .from('template_usage')
        .select('*')
        .eq('shop_domain', shopDomain)
        .eq('product_gid', productGid)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in hasProductTemplate:', error);
      return null;
    }
  }

  /**
   * Récupérer les détails d'usage d'un template
   */
  async getTemplateUsage(templateId: string): Promise<TemplateUsageRecord | null> {
    try {
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - getTemplateUsage retourne null');
        return null;
      }

      const { data, error } = await supabase
        .from('template_usage')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTemplateUsage:', error);
      return null;
    }
  }

  /**
   * Mettre à jour le plan utilisateur (stub pour compatibilité)
   */
  async updateUserPlan(shopDomain: string, planType: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.log('🔄 QuotaService: Mode fallback - updateUserPlan simulé');
        return true;
      }

      // Cette méthode pourrait être implémentée plus tard
      console.log(`🔄 updateUserPlan: ${shopDomain} -> ${planType} (non implémenté)`);
      return true;
    } catch (error) {
      console.error('Error in updateUserPlan:', error);
      return false;
    }
  }
}

// Instance singleton
export const quotaService = new QuotaService();
export default quotaService;