-- Migration 001: Schéma initial Adlign
-- Date: 2025-01-10
-- Description: Tables de base pour l'application Adlign

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLE: shops (OAuth tokens)
-- ========================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  shop_owner VARCHAR(255),
  email VARCHAR(255),
  country_code VARCHAR(10),
  currency VARCHAR(10),
  timezone VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- ========================================
-- TABLE: analytics_events
-- ========================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  variant_handle VARCHAR(255),
  product_gid VARCHAR(255),
  campaign_ref VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: mapping_jobs (queue alternative)
-- ========================================
CREATE TABLE IF NOT EXISTS mapping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) NOT NULL,
  product_url TEXT,
  product_gid VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  estimated_duration VARCHAR(100),
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- TABLE: theme_adapters (mapping IA)
-- ========================================
CREATE TABLE IF NOT EXISTS theme_adapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) NOT NULL,
  theme_id VARCHAR(255),
  theme_name VARCHAR(255),
  theme_fingerprint VARCHAR(255) UNIQUE,
  adapter_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: adlign_variants (variantes de produits)
-- ========================================
CREATE TABLE IF NOT EXISTS adlign_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain VARCHAR(255) NOT NULL,
  product_gid VARCHAR(255) NOT NULL,
  variant_handle VARCHAR(255) NOT NULL,
  variant_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte d'unicité
  UNIQUE(shop_domain, product_gid, variant_handle)
);

-- ========================================
-- INDEXES pour les performances
-- ========================================

-- Shops
CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(domain);
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_shop ON analytics_events(shop_domain);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_variant ON analytics_events(variant_handle);

-- Mapping jobs
CREATE INDEX IF NOT EXISTS idx_mapping_jobs_shop ON mapping_jobs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_mapping_jobs_status ON mapping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mapping_jobs_created ON mapping_jobs(created_at);

-- Theme adapters
CREATE INDEX IF NOT EXISTS idx_theme_adapters_shop ON theme_adapters(shop_domain);
CREATE INDEX IF NOT EXISTS idx_theme_adapters_fingerprint ON theme_adapters(theme_fingerprint);

-- Variants
CREATE INDEX IF NOT EXISTS idx_variants_shop_product ON adlign_variants(shop_domain, product_gid);
CREATE INDEX IF NOT EXISTS idx_variants_handle ON adlign_variants(variant_handle);

-- ========================================
-- TRIGGERS pour updated_at
-- ========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger sur toutes les tables avec updated_at
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mapping_jobs_updated_at BEFORE UPDATE ON mapping_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_theme_adapters_updated_at BEFORE UPDATE ON theme_adapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON adlign_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMMENTAIRES
-- ========================================
COMMENT ON TABLE shops IS 'Boutiques Shopify authentifiées avec leurs tokens OAuth';
COMMENT ON TABLE analytics_events IS 'Événements analytics des variantes Adlign';
COMMENT ON TABLE mapping_jobs IS 'Jobs de mapping IA des thèmes Shopify';
COMMENT ON TABLE theme_adapters IS 'Adapters de thème générés par IA pour le mapping';
COMMENT ON TABLE adlign_variants IS 'Variantes dynamiques des produits Shopify';

COMMENT ON COLUMN shops.access_token IS 'Token d''accès Shopify (chiffré)';
COMMENT ON COLUMN shops.expires_at IS 'Date d''expiration du token';
COMMENT ON COLUMN analytics_events.metadata IS 'Données supplémentaires de l''événement';
COMMENT ON COLUMN mapping_jobs.result IS 'Résultat du mapping (JSON)';
COMMENT ON COLUMN theme_adapters.adapter_data IS 'Données de l''adapter (sélecteurs, stratégies)';
COMMENT ON COLUMN adlign_variants.variant_data IS 'Données de la variante (titre, images, CTA, etc.)';
