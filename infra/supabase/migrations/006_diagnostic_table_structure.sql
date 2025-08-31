-- Migration 006: Diagnostic de la structure réelle de la table shops
-- Vérifier quelles colonnes existent vraiment

-- Afficher la structure de la table shops
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shops' 
ORDER BY ordinal_position;

-- Afficher quelques exemples de données pour comprendre la structure
SELECT * FROM shops LIMIT 3;