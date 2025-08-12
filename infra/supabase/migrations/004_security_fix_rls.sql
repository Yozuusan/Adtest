-- Migration 004: CORRECTION URGENTE SÉCURITÉ RLS
-- Date: 2025-01-12
-- Description: Correction des politiques RLS dangereuses qui exposent les tokens Shopify

-- ========================================
-- ÉTAPE 1: SUPPRIMER TOUTES LES POLITIQUES DANGEREUSES
-- ========================================

-- Supprimer les politiques permissives sur shops (TOKENS SENSIBLES !)
DROP POLICY IF EXISTS "Users can view own shops" ON shops;
DROP POLICY IF EXISTS "Users can update own shops" ON shops;
DROP POLICY IF EXISTS "Users can insert own shops" ON shops;
DROP POLICY IF EXISTS "Service role has full access" ON shops;

-- Supprimer les politiques permissives sur analytics_events
DROP POLICY IF EXISTS "Users can view own analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics_events;
DROP POLICY IF EXISTS "Service role has full access" ON analytics_events;

-- Supprimer les politiques permissives sur adlign_variants
DROP POLICY IF EXISTS "Users can view own variants" ON adlign_variants;
DROP POLICY IF EXISTS "Users can insert own variants" ON adlign_variants;
DROP POLICY IF EXISTS "Users can update own variants" ON adlign_variants;
DROP POLICY IF EXISTS "Users can delete own variants" ON adlign_variables;
DROP POLICY IF EXISTS "Service role has full access" ON adlign_variants;

-- Supprimer les politiques permissives sur mapping_jobs
DROP POLICY IF EXISTS "Users can view own mapping jobs" ON mapping_jobs;
DROP POLICY IF EXISTS "Users can insert own mapping jobs" ON mapping_jobs;
DROP POLICY IF EXISTS "Users can update own mapping jobs" ON mapping_jobs;
DROP POLICY IF EXISTS "Service role has full access" ON mapping_jobs;

-- Supprimer les politiques permissives sur theme_adapters
DROP POLICY IF EXISTS "Users can view own theme adapters" ON theme_adapters;
DROP POLICY IF EXISTS "Users can insert own theme adapters" ON theme_adapters;
DROP POLICY IF EXISTS "Users can update own theme adapters" ON theme_adapters;
DROP POLICY IF EXISTS "Service role has full access" ON theme_adapters;

-- Supprimer les politiques permissives sur brand_analysis
DROP POLICY IF EXISTS "Users can view own brand analysis" ON brand_analysis;
DROP POLICY IF EXISTS "Users can update own brand analysis" ON brand_analysis;
DROP POLICY IF EXISTS "Users can insert own brand analysis" ON brand_analysis;
DROP POLICY IF EXISTS "Service role has full access" ON brand_analysis;

-- ========================================
-- ÉTAPE 2: CRÉER DES POLITIQUES SÉCURISÉES
-- ========================================

-- ========================================
-- TABLE: shops (TOKENS SENSIBLES - ACCÈS RESTRICTIF)
-- ========================================
-- ACCÈS UNIQUEMENT VIA service_role (backend)
CREATE POLICY "shops_service_role_only" ON shops
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- TABLE: analytics_events (données par boutique)
-- ========================================
-- Lecture: uniquement sa propre boutique
CREATE POLICY "analytics_shop_isolation_select" ON analytics_events
  FOR SELECT USING (shop = current_setting('app.shop_domain', true)::text);

-- Insertion: uniquement sa propre boutique
CREATE POLICY "analytics_shop_isolation_insert" ON analytics_events
  FOR INSERT WITH CHECK (shop = current_setting('app.shop_domain', true)::text);

-- ========================================
-- TABLE: adlign_variants (variantes par boutique)
-- ========================================
-- Lecture: uniquement sa propre boutique
CREATE POLICY "variants_shop_isolation_select" ON adlign_variants
  FOR SELECT USING (shop = current_setting('app.shop_domain', true)::text);

-- Insertion: uniquement sa propre boutique
CREATE POLICY "variants_shop_isolation_insert" ON adlign_variants
  FOR INSERT WITH CHECK (shop = current_setting('app.shop_domain', true)::text);

-- Modification: uniquement sa propre boutique
CREATE POLICY "variants_shop_isolation_update" ON adlign_variants
  FOR UPDATE USING (shop = current_setting('app.shop_domain', true)::text);

-- Suppression: uniquement sa propre boutique
CREATE POLICY "variants_shop_isolation_delete" ON adlign_variants
  FOR DELETE USING (shop = current_setting('app.shop_domain', true)::text);

-- ========================================
-- TABLE: mapping_jobs (jobs par boutique)
-- ========================================
-- Lecture: uniquement sa propre boutique
CREATE POLICY "mapping_jobs_shop_isolation_select" ON mapping_jobs
  FOR SELECT USING (shop_id = current_setting('app.shop_domain', true)::text);

-- Insertion: uniquement sa propre boutique
CREATE POLICY "mapping_jobs_shop_isolation_insert" ON mapping_jobs
  FOR INSERT WITH CHECK (shop_id = current_setting('app.shop_domain', true)::text);

-- Modification: uniquement sa propre boutique
CREATE POLICY "mapping_jobs_shop_isolation_update" ON mapping_jobs
  FOR UPDATE USING (shop_id = current_setting('app.shop_domain', true)::text);

-- ========================================
-- TABLE: theme_adapters (adaptateurs par boutique)
-- ========================================
-- Lecture: uniquement sa propre boutique
CREATE POLICY "theme_adapters_shop_isolation_select" ON theme_adapters
  FOR SELECT USING (shop_id = current_setting('app.shop_domain', true)::text);

-- Insertion: uniquement sa propre boutique
CREATE POLICY "theme_adapters_shop_isolation_insert" ON theme_adapters
  FOR INSERT WITH CHECK (shop_id = current_setting('app.shop_domain', true)::text);

-- Modification: uniquement sa propre boutique
CREATE POLICY "theme_adapters_shop_isolation_update" ON theme_adapters
  FOR UPDATE USING (shop_id = current_setting('app.shop_domain', true)::text);

-- ========================================
-- TABLE: brand_analysis (analyses par boutique)
-- ========================================
-- Lecture: uniquement sa propre boutique
CREATE POLICY "brand_analysis_shop_isolation_select" ON brand_analysis
  FOR SELECT USING (shop = current_setting('app.shop_domain', true)::text);

-- Insertion: uniquement sa propre boutique
CREATE POLICY "brand_analysis_shop_isolation_insert" ON brand_analysis
  FOR INSERT WITH CHECK (shop = current_setting('app.shop_domain', true)::text);

-- Modification: uniquement sa propre boutique
CREATE POLICY "brand_analysis_shop_isolation_update" ON brand_analysis
  FOR UPDATE USING (shop = current_setting('app.shop_domain', true)::text);

-- ========================================
-- ÉTAPE 3: VÉRIFICATION SÉCURITÉ
-- ========================================

-- Vérifier que toutes les politiques dangereuses sont supprimées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('shops', 'analytics_events', 'adlign_variants', 'mapping_jobs', 'theme_adapters', 'brand_analysis')
ORDER BY tablename, policyname;

-- ========================================
-- COMMENTAIRES DE SÉCURITÉ
-- ========================================
COMMENT ON POLICY "shops_service_role_only" ON shops IS 'ACCÈS RESTRICTIF: Seul le service_role peut accéder aux tokens Shopify';
COMMENT ON POLICY "analytics_shop_isolation_select" ON analytics_events IS 'ISOLATION BOUTIQUE: Chaque boutique ne voit que ses propres analytics';
COMMENT ON POLICY "variants_shop_isolation_select" ON adlign_variants IS 'ISOLATION BOUTIQUE: Chaque boutique ne voit que ses propres variantes';
COMMENT ON POLICY "mapping_jobs_shop_isolation_select" ON mapping_jobs IS 'ISOLATION BOUTIQUE: Chaque boutique ne voit que ses propres jobs';
COMMENT ON POLICY "theme_adapters_shop_isolation_select" ON theme_adapters IS 'ISOLATION BOUTIQUE: Chaque boutique ne voit que ses propres adaptateurs';
COMMENT ON POLICY "brand_analysis_shop_isolation_select" ON brand_analysis IS 'ISOLATION BOUTIQUE: Chaque boutique ne voit que ses propres analyses';
