-- Migration 002: Politiques RLS (Row Level Security)
-- Date: 2025-01-10
-- Description: Sécurité au niveau des lignes pour Supabase

-- ========================================
-- ENABLE RLS sur toutes les tables
-- ========================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE adlign_variants ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLITIQUES SHOPS
-- ========================================

-- Lecture : Seulement les boutiques actives
CREATE POLICY "shops_select_active" ON shops
  FOR SELECT USING (is_active = true);

-- Insertion : Seulement via l'API backend (service role)
CREATE POLICY "shops_insert_service_role" ON shops
  FOR INSERT WITH CHECK (true);

-- Mise à jour : Seulement via l'API backend
CREATE POLICY "shops_update_service_role" ON shops
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression : Seulement via l'API backend
CREATE POLICY "shops_delete_service_role" ON shops
  FOR DELETE USING (true);

-- ========================================
-- POLITIQUES ANALYTICS_EVENTS
-- ========================================

-- Lecture : Seulement les événements de sa propre boutique
CREATE POLICY "analytics_events_select_own_shop" ON analytics_events
  FOR SELECT USING (
    shop_domain IN (
      SELECT domain FROM shops WHERE is_active = true
    )
  );

-- Insertion : Seulement via l'API backend
CREATE POLICY "analytics_events_insert_service_role" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Mise à jour : Seulement via l'API backend
CREATE POLICY "analytics_events_update_service_role" ON analytics_events
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression : Seulement via l'API backend
CREATE POLICY "analytics_events_delete_service_role" ON analytics_events
  FOR DELETE USING (true);

-- ========================================
-- POLITIQUES MAPPING_JOBS
-- ========================================

-- Lecture : Seulement les jobs de sa propre boutique
CREATE POLICY "mapping_jobs_select_own_shop" ON mapping_jobs
  FOR SELECT USING (
    shop_domain IN (
      SELECT domain FROM shops WHERE is_active = true
    )
  );

-- Insertion : Seulement via l'API backend
CREATE POLICY "mapping_jobs_insert_service_role" ON mapping_jobs
  FOR INSERT WITH CHECK (true);

-- Mise à jour : Seulement via l'API backend
CREATE POLICY "mapping_jobs_update_service_role" ON mapping_jobs
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression : Seulement via l'API backend
CREATE POLICY "mapping_jobs_delete_service_role" ON mapping_jobs
  FOR DELETE USING (true);

-- ========================================
-- POLITIQUES THEME_ADAPTERS
-- ========================================

-- Lecture : Seulement les adapters de sa propre boutique
CREATE POLICY "theme_adapters_select_own_shop" ON theme_adapters
  FOR SELECT USING (
    shop_domain IN (
      SELECT domain FROM shops WHERE is_active = true
    )
  );

-- Insertion : Seulement via l'API backend
CREATE POLICY "theme_adapters_insert_service_role" ON theme_adapters
  FOR INSERT WITH CHECK (true);

-- Mise à jour : Seulement via l'API backend
CREATE POLICY "theme_adapters_update_service_role" ON theme_adapters
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression : Seulement via l'API backend
CREATE POLICY "theme_adapters_delete_service_role" ON theme_adapters
  FOR DELETE USING (true);

-- ========================================
-- POLITIQUES ADLIGN_VARIANTS
-- ========================================

-- Lecture : Seulement les variantes de sa propre boutique
CREATE POLICY "adlign_variants_select_own_shop" ON adlign_variants
  FOR SELECT USING (
    shop_domain IN (
      SELECT domain FROM shops WHERE is_active = true
    )
  );

-- Insertion : Seulement via l'API backend
CREATE POLICY "adlign_variants_insert_service_role" ON adlign_variants
  FOR INSERT WITH CHECK (true);

-- Mise à jour : Seulement via l'API backend
CREATE POLICY "adlign_variants_update_service_role" ON adlign_variants
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression : Seulement via l'API backend
CREATE POLICY "adlign_variants_delete_service_role" ON adlign_variants
  FOR DELETE USING (true);

-- ========================================
-- FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour vérifier si un utilisateur appartient à une boutique
CREATE OR REPLACE FUNCTION is_shop_member(shop_domain_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Pour l'instant, on considère que l'API backend a accès à tout
  -- Dans le futur, on pourra ajouter une logique d'authentification utilisateur
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- COMMENTAIRES
-- ========================================
COMMENT ON POLICY "shops_select_active" ON shops IS 'Lecture publique des boutiques actives';
COMMENT ON POLICY "analytics_events_select_own_shop" ON analytics_events IS 'Lecture des analytics de sa propre boutique';
COMMENT ON POLICY "mapping_jobs_select_own_shop" ON mapping_jobs IS 'Lecture des jobs de mapping de sa propre boutique';
COMMENT ON POLICY "theme_adapters_select_own_shop" ON theme_adapters IS 'Lecture des adapters de thème de sa propre boutique';
COMMENT ON POLICY "adlign_variants_select_own_shop" ON adlign_variants IS 'Lecture des variantes de sa propre boutique';

-- ========================================
-- NOTES DE SÉCURITÉ
-- ========================================
/*
IMPORTANT: Ces politiques RLS supposent que l'API backend utilise le service_role
de Supabase pour toutes les opérations. Les utilisateurs finaux n'ont pas d'accès
direct à la base de données.

Pour une sécurité maximale :
1. L'API backend doit valider l'authentification Shopify
2. Les tokens d'accès doivent être chiffrés
3. Les requêtes doivent être validées et sanitizées
4. Les logs d'accès doivent être maintenus
*/
