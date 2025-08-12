-- Migration 003: Table brand_analysis pour l'analyse de marque
-- Date: 2025-01-10
-- Description: Table pour stocker les analyses de marque générées par IA

-- ========================================
-- TABLE: brand_analysis
-- ========================================
CREATE TABLE IF NOT EXISTS brand_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop VARCHAR(255) NOT NULL,
  ai_analysis JSONB NOT NULL,
  custom_brand_info JSONB DEFAULT '{}',
  analysis_type VARCHAR(50) DEFAULT 'automatic', -- 'automatic', 'manual', 'hybrid'
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  products_analyzed INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('automatic', 'manual', 'hybrid'))
);

-- ========================================
-- INDEXES pour les performances
-- ========================================
CREATE INDEX IF NOT EXISTS idx_brand_analysis_shop ON brand_analysis(shop);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_type ON brand_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_confidence ON brand_analysis(confidence_score);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_updated ON brand_analysis(last_updated);

-- ========================================
-- TRIGGER pour updated_at
-- ========================================
CREATE TRIGGER update_brand_analysis_updated_at 
  BEFORE UPDATE ON brand_analysis 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMMENTAIRES
-- ========================================
COMMENT ON TABLE brand_analysis IS 'Analyses de marque générées par IA et informations manuelles';
COMMENT ON COLUMN brand_analysis.ai_analysis IS 'Analyse automatique générée par OpenAI (personnalité, audience, etc.)';
COMMENT ON COLUMN brand_analysis.custom_brand_info IS 'Informations de marque saisies manuellement par l''utilisateur';
COMMENT ON COLUMN brand_analysis.confidence_score IS 'Score de confiance de l''analyse IA (0.0 à 1.0)';
COMMENT ON COLUMN brand_analysis.products_analyzed IS 'Nombre de produits analysés pour cette analyse';
COMMENT ON COLUMN brand_analysis.analysis_type IS 'Type d''analyse : automatique (IA), manuel, ou hybride';

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE brand_analysis ENABLE ROW LEVEL SECURITY;

-- Politique pour les boutiques : accès uniquement à leurs propres analyses
CREATE POLICY "Users can view own brand analysis" ON brand_analysis
  FOR SELECT USING (shop = current_setting('app.shop_domain', true)::text);

-- Politique pour les boutiques : modification uniquement de leurs propres analyses
CREATE POLICY "Users can update own brand analysis" ON brand_analysis
  FOR UPDATE USING (shop = current_setting('app.shop_domain', true)::text);

-- Politique pour les boutiques : insertion uniquement pour leur propre boutique
CREATE POLICY "Users can insert own brand analysis" ON brand_analysis
  FOR INSERT WITH CHECK (shop = current_setting('app.shop_domain', true)::text);

-- Politique pour le service : accès complet
CREATE POLICY "Service role has full access" ON brand_analysis
  FOR ALL USING (auth.role() = 'service_role');
