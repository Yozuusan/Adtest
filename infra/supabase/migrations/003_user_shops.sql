-- Migration 003: User-Shop Association Table
-- Permet à un utilisateur d'avoir plusieurs boutiques Shopify

-- Table de liaison utilisateur-boutiques
CREATE TABLE IF NOT EXISTS user_shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un utilisateur ne peut avoir qu'un seul rôle par boutique
  UNIQUE(user_id, shop_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_shops_user_id ON user_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shops_shop_id ON user_shops(shop_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_shops_updated_at
    BEFORE UPDATE ON user_shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies pour user_shops
ALTER TABLE user_shops ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres associations boutique
CREATE POLICY "Users can view their own shop associations" 
ON user_shops FOR SELECT 
USING (auth.uid() = user_id);

-- Les propriétaires peuvent inviter d'autres utilisateurs
CREATE POLICY "Owners can manage shop associations" 
ON user_shops FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_shops us 
    WHERE us.user_id = auth.uid() 
    AND us.shop_id = user_shops.shop_id 
    AND us.role = 'owner'
  )
);

-- Les utilisateurs peuvent accepter des invitations (insert leur propre association)
CREATE POLICY "Users can accept shop invitations" 
ON user_shops FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ajouter une contrainte pour s'assurer qu'il y a toujours au moins un owner par boutique
-- (sera géré au niveau application pour éviter les problèmes de concurrence)

-- Fonction helper pour obtenir les boutiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_shops(user_uuid UUID)
RETURNS TABLE (
  shop_id UUID,
  shop_domain VARCHAR,
  role VARCHAR,
  shop_owner VARCHAR,
  email VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shop_id,
    s.shop_domain,
    us.role,
    s.shop_owner,
    s.email,
    s.is_active,
    s.created_at
  FROM user_shops us
  JOIN shops s ON s.id = us.shop_id
  WHERE us.user_id = user_uuid
  AND s.is_active = true
  ORDER BY us.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;