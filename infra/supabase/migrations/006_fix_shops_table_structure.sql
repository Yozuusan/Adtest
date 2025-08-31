-- Migration 006: Fix table shops structure inconsistencies
-- Corriger définitivement la structure de la table shops

-- Option 1: Si la table shops a une colonne shop_domain, la renommer en domain
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shops' AND column_name = 'shop_domain'
    ) THEN
        ALTER TABLE shops RENAME COLUMN shop_domain TO domain;
    END IF;
END $$;

-- Option 2: Si la table shops n'a pas de colonne domain, l'ajouter
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shops' AND column_name = 'domain'
    ) THEN
        ALTER TABLE shops ADD COLUMN domain VARCHAR(255) UNIQUE;
        -- Si il y a déjà des données, copier depuis une autre colonne si elle existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'shops' AND column_name = 'shop_domain'
        ) THEN
            UPDATE shops SET domain = shop_domain WHERE domain IS NULL;
        END IF;
    END IF;
END $$;

-- S'assurer que la colonne domain est NOT NULL et UNIQUE
ALTER TABLE shops ALTER COLUMN domain SET NOT NULL;

-- Nettoyer les policies RLS problématiques qui causent la récursion infinie
DROP POLICY IF EXISTS "Users can manage their shop associations" ON user_shops;
DROP POLICY IF EXISTS "Owners can manage shop associations" ON user_shops;
DROP POLICY IF EXISTS "Owners can update shop associations" ON user_shops;
DROP POLICY IF EXISTS "Owners can delete shop associations" ON user_shops;
DROP POLICY IF EXISTS "Owners can invite users to their shops" ON user_shops;

-- Créer des policies RLS simples et non-récursives
CREATE POLICY "user_shops_select_policy" ON user_shops
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_shops_insert_policy" ON user_shops
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_shops_update_policy" ON user_shops
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_shops_delete_policy" ON user_shops
  FOR DELETE USING (auth.uid() = user_id);

-- Vérification finale - créer une vue pour diagnostiquer
CREATE OR REPLACE VIEW shops_diagnostic AS
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'shops'
ORDER BY ordinal_position;