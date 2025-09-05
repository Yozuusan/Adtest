import { Router } from 'express';
import { supabaseService } from '../services/supabase';

const router = Router();

/**
 * Debug endpoint pour identifier l'utilisateur du frontend
 * POST /debug-frontend/identify
 */
router.post('/identify', async (req, res) => {
  try {
    const { user_id, email } = req.body;
    
    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required'
      });
    }

    console.log(`🔍 Frontend Debug - User ID: ${user_id}, Email: ${email}`);

    // Récupérer les boutiques de cet utilisateur
    const { data: userShops, error } = await supabaseService.supabase
      .from('user_shops')
      .select(`
        *,
        shops (
          id,
          domain,
          is_active,
          created_at
        )
      `)
      .eq('user_id', user_id);

    if (error) {
      console.error('❌ Error fetching user shops for frontend user:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      success: true,
      debug_info: {
        frontend_user_id: user_id,
        frontend_email: email,
        shops_found: userShops?.length || 0,
        shops: userShops || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Debug frontend error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Associer l'utilisateur frontend avec la boutique existante
 * POST /debug-frontend/link-shop
 */
router.post('/link-shop', async (req, res) => {
  try {
    const { user_id, shop_domain } = req.body;
    
    if (!user_id || !shop_domain) {
      return res.status(400).json({
        error: 'user_id and shop_domain are required'
      });
    }

    console.log(`🔗 Linking frontend user ${user_id} to shop ${shop_domain}`);

    // Trouver la boutique par domaine
    const { data: shop, error: shopError } = await supabaseService.supabase
      .from('shops')
      .select('*')
      .eq('domain', shop_domain)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({
        error: 'Shop not found',
        shop_domain
      });
    }

    // Vérifier si l'association existe déjà
    const { data: existingAssoc } = await supabaseService.supabase
      .from('user_shops')
      .select('*')
      .eq('user_id', user_id)
      .eq('shop_id', shop.id)
      .single();

    if (existingAssoc) {
      return res.json({
        success: true,
        message: 'User already linked to shop',
        association: existingAssoc
      });
    }

    // Créer l'association
    const { data: newAssoc, error: assocError } = await supabaseService.supabase
      .from('user_shops')
      .insert({
        user_id,
        shop_id: shop.id,
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (assocError) {
      console.error('❌ Error creating user-shop association:', assocError);
      return res.status(500).json({
        error: 'Failed to create association',
        details: assocError.message
      });
    }

    console.log('✅ User linked to shop successfully');

    res.json({
      success: true,
      message: 'User linked to shop successfully',
      association: newAssoc,
      shop: {
        id: shop.id,
        domain: shop.domain,
        is_active: shop.is_active
      }
    });

  } catch (error) {
    console.error('❌ Link shop error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;