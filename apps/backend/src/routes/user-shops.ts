import { Router } from 'express';
import { supabaseService } from '../services/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * Récupérer les boutiques d'un utilisateur
 * GET /user-shops/:user_id
 */
router.get('/:user_id', async (req, res, next) => {
  try {
    console.log('🔍 =========================== USER SHOPS REQUEST ===========================');
    console.log('📋 Request details:');
    console.log('   URL:', req.url);
    console.log('   Method:', req.method);
    console.log('   User ID:', req.params.user_id);
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    
    const { user_id } = req.params;
    
    if (!user_id) {
      console.log('❌ User ID parameter missing');
      throw createError('User ID parameter is required', 400);
    }

    console.log(`🔄 Fetching shops for user: ${user_id}`);
    
    // Récupérer les boutiques de l'utilisateur depuis Supabase
    const userShops = await supabaseService.getUserShops(user_id);
    
    console.log(`✅ Found ${userShops.length} shops for user ${user_id}`);
    console.log('📊 Shops data:', JSON.stringify(userShops, null, 2));
    
    res.json({
      user_id,
      shops: userShops,
      count: userShops.length,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ =========================== USER SHOPS SUCCESS ===========================');
  } catch (error) {
    console.error('❌ =========================== USER SHOPS ERROR ===========================');
    console.error('❌ Error fetching user shops:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ =========================== USER SHOPS ERROR END ===========================');
    next(error);
  }
});

/**
 * Récupérer toutes les boutiques (pour debug)
 * GET /user-shops/debug/all
 */
router.get('/debug/all', async (req, res, next) => {
  try {
    console.log('🔍 DEBUG: Fetching all user-shop associations');
    
    // Pour debug - récupérer toutes les associations
    const { data, error } = await supabaseService['client']
      .from('user_shops')
      .select(`
        id,
        user_id,
        shop_id,
        role,
        created_at,
        updated_at,
        shop:shops!inner (
          id,
          domain,
          shop_owner,
          email,
          is_active
        )
      `);
    
    if (error) {
      console.error('❌ Debug query error:', error);
      throw error;
    }
    
    console.log('📊 All user-shop associations:', JSON.stringify(data, null, 2));
    
    res.json({
      total: data?.length || 0,
      associations: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Debug all user shops error:', error);
    next(error);
  }
});

export default router;