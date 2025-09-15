-- Migration 002: Système de quotas templates
-- Date: 2025-01-14
-- Description: Tables pour gérer les quotas de templates par plan et tracking usage

-- ========================================
-- TABLE: user_plans (plans des utilisateurs)
-- ========================================
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'business', 'enterprise')),
  templates_limit INTEGER DEFAULT 1,
  templates_used INTEGER DEFAULT 0,
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: template_usage (usage des templates)
-- ========================================
CREATE TABLE IF NOT EXISTS template_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  product_gid VARCHAR(255) NOT NULL,
  product_handle VARCHAR(255) NOT NULL,
  template_style VARCHAR(100) DEFAULT 'auto-generated',
  theme_fingerprint VARCHAR(255),
  shopify_template_key VARCHAR(500), -- "templates/product.adlign-savoncoco.liquid"
  deployment_status VARCHAR(50) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deployed', 'failed', 'archived')),
  confidence_avg DECIMAL(3,2) DEFAULT 0.0,
  mapping_elements INTEGER DEFAULT 0,
  test_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployed_at TIMESTAMP WITH TIME ZONE,
  
  -- Contrainte d'unicité par produit par boutique
  UNIQUE(shop_domain, product_gid)
);

-- ========================================
-- TABLE: template_analytics (analytics des templates)
-- ========================================
CREATE TABLE IF NOT EXISTS template_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_usage_id UUID REFERENCES template_usage(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  product_handle VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'conversion', 'add_to_cart'
  metric_value DECIMAL(10,2) DEFAULT 1.0,
  session_id VARCHAR(255),
  user_agent TEXT,
  referrer TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ========================================
-- INDEXES pour les performances
-- ========================================

-- User plans
CREATE INDEX IF NOT EXISTS idx_user_plans_shop ON user_plans(shop_domain);
CREATE INDEX IF NOT EXISTS idx_user_plans_type ON user_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_plans_billing ON user_plans(billing_cycle_start, billing_cycle_end);

-- Template usage
CREATE INDEX IF NOT EXISTS idx_template_usage_shop ON template_usage(shop_domain);
CREATE INDEX IF NOT EXISTS idx_template_usage_product ON template_usage(product_gid);
CREATE INDEX IF NOT EXISTS idx_template_usage_status ON template_usage(deployment_status);
CREATE INDEX IF NOT EXISTS idx_template_usage_active ON template_usage(is_active);
CREATE INDEX IF NOT EXISTS idx_template_usage_created ON template_usage(created_at);

-- Template analytics
CREATE INDEX IF NOT EXISTS idx_template_analytics_usage ON template_analytics(template_usage_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_shop ON template_analytics(shop_domain);
CREATE INDEX IF NOT EXISTS idx_template_analytics_metric ON template_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_template_analytics_timestamp ON template_analytics(timestamp);

-- ========================================
-- TRIGGERS pour updated_at
-- ========================================
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON user_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_usage_updated_at BEFORE UPDATE ON template_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCTIONS pour la gestion des quotas
-- ========================================

-- Fonction pour vérifier les quotas disponibles
CREATE OR REPLACE FUNCTION check_template_quota(p_shop_domain VARCHAR(255))
RETURNS TABLE(
  plan_type VARCHAR(50),
  templates_limit INTEGER,
  templates_used INTEGER,
  templates_remaining INTEGER,
  quota_exceeded BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.plan_type,
    up.templates_limit,
    up.templates_used,
    (up.templates_limit - up.templates_used) as templates_remaining,
    (up.templates_used >= up.templates_limit) as quota_exceeded
  FROM user_plans up
  WHERE up.shop_domain = p_shop_domain
    AND up.is_active = true;
    
  -- Si aucun plan trouvé, créer un plan basic par défaut
  IF NOT FOUND THEN
    INSERT INTO user_plans (shop_domain, plan_type, templates_limit, templates_used)
    VALUES (p_shop_domain, 'basic', 1, 0);
    
    RETURN QUERY
    SELECT 
      'basic'::VARCHAR(50) as plan_type,
      1 as templates_limit,
      0 as templates_used,
      1 as templates_remaining,
      false as quota_exceeded;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour incrémenter l'usage des templates
CREATE OR REPLACE FUNCTION increment_template_usage(p_shop_domain VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  current_quota RECORD;
BEGIN
  -- Vérifier le quota actuel
  SELECT * INTO current_quota FROM check_template_quota(p_shop_domain);
  
  -- Si le quota est dépassé, ne pas incrémenter
  IF current_quota.quota_exceeded THEN
    RETURN FALSE;
  END IF;
  
  -- Incrémenter le compteur
  UPDATE user_plans 
  SET templates_used = templates_used + 1,
      updated_at = NOW()
  WHERE shop_domain = p_shop_domain
    AND is_active = true;
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour reset les quotas mensuels
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
BEGIN
  UPDATE user_plans 
  SET templates_used = 0,
      billing_cycle_start = CURRENT_DATE,
      billing_cycle_end = (CURRENT_DATE + INTERVAL '1 month'),
      updated_at = NOW()
  WHERE billing_cycle_end <= CURRENT_DATE
    AND is_active = true;
    
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DATA: Plans par défaut
-- ========================================

-- Insérer les limites de plans par défaut (fonction pour référence)
CREATE OR REPLACE FUNCTION get_plan_limits(plan_name VARCHAR(50))
RETURNS INTEGER AS $$
BEGIN
  CASE plan_name
    WHEN 'basic' THEN RETURN 1;
    WHEN 'pro' THEN RETURN 5;
    WHEN 'business' THEN RETURN 20;
    WHEN 'enterprise' THEN RETURN 999;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMMENTAIRES
-- ========================================
COMMENT ON TABLE user_plans IS 'Plans utilisateurs avec quotas de templates';
COMMENT ON TABLE template_usage IS 'Usage et tracking des templates déployés par boutique';
COMMENT ON TABLE template_analytics IS 'Analytics des performances des templates';

COMMENT ON COLUMN user_plans.templates_limit IS 'Nombre maximum de templates autorisés par mois';
COMMENT ON COLUMN user_plans.templates_used IS 'Nombre de templates utilisés ce mois';
COMMENT ON COLUMN template_usage.shopify_template_key IS 'Clé du template dans Shopify (ex: templates/product.adlign-savoncoco.liquid)';
COMMENT ON COLUMN template_usage.confidence_avg IS 'Score de confiance moyen du mapping';
COMMENT ON COLUMN template_analytics.metric_type IS 'Type de métrique: view, click, conversion, add_to_cart';

-- ========================================
-- TRIGGER d'auto-reset mensuel (job cron recommandé)
-- ========================================
-- Pour production, utiliser pg_cron:
-- SELECT cron.schedule('reset-template-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas();');