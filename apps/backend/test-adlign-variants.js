/**
 * Script de test pour créer des variantes Adlign via l'API
 */

const BACKEND_URL = 'http://localhost:3001';
const SHOP = 'adlign.myshopify.com';
const PRODUCT_ID = 54901869805894; // ID du produit "Échantillon Savon à Barres de Noix de Coco"

// Variantes à créer
const variants = {
  'test': {
    title: '🎯 INJECTION DIRECTE RÉUSSIE - Échantillon Savon à Barres de Noix de Coco',
    subtitle: 'Offre limitée - Livraison gratuite',
    description_html: '<p><strong>✅ Injection directe fonctionnelle !</strong> Plus d\'ancien script.</p><p>Le Savon à Barres de Noix de Coco est parfait pour le nettoyage quotidien. Il est fait main en petites quantités utilisant des méthodes traditionnelles et assez doux pour un usage quotidien.</p>',
    hero_image: 'https://cdn.shopify.com/s/files/1/0533/2085/files/coconut-soap.jpg',
    usp_list: [
      '🎯 Injection directe',
      '🚚 Livraison gratuite',
      '↩️ Retour 30 jours'
    ],
    cta_primary: '🎯 INJECTION DIRECTE',
    cta_secondary: 'Voir les détails',
    badges: [
      'INJECTION DIRECTE',
      'LIMITÉ',
      'EXCLUSIF'
    ],
    campaign_ref: 'DIRECT-TEST',
    theme_fingerprint: 'horizon-theme-v1'
  },
  'promo': {
    title: '🔥 OFFRE SPÉCIALE LIMITÉE - Échantillon Savon à Barres de Noix de Coco',
    subtitle: '50% DE RÉDUCTION - Livraison gratuite',
    description_html: '<p><strong>🔥 Promotion exceptionnelle !</strong> Offre valable jusqu\'à épuisement des stocks. Livraison gratuite incluse.</p><p>Le Savon à Barres de Noix de Coco est parfait pour le nettoyage quotidien. Il est fait main en petites quantités utilisant des méthodes traditionnelles et assez doux pour un usage quotidien.</p>',
    hero_image: 'https://cdn.shopify.com/s/files/1/0533/2085/files/coconut-soap-promo.jpg',
    usp_list: [
      '🔥 -50% aujourd\'hui',
      '🚚 Livraison gratuite',
      '⚡ Offre limitée',
      '💎 Qualité premium'
    ],
    cta_primary: '🔥 PROFITER DE L\'OFFRE',
    cta_secondary: 'Voir les détails',
    badges: [
      'PROMOTION',
      '-50%',
      'LIMITÉ'
    ],
    campaign_ref: 'PROMO-SPECIAL',
    theme_fingerprint: 'horizon-theme-v1'
  },
  'blackfriday': {
    title: '⚫ BLACK FRIDAY - Échantillon Savon à Barres de Noix de Coco',
    subtitle: 'Offre unique - Ne manquez pas ça !',
    description_html: '<p><strong>⚫ BLACK FRIDAY EXCLUSIF !</strong> La meilleure offre de l\'année sur notre savon premium. Quantités limitées !</p><p>Le Savon à Barres de Noix de Coco est parfait pour le nettoyage quotidien. Il est fait main en petites quantités utilisant des méthodes traditionnelles et assez doux pour un usage quotidien.</p>',
    hero_image: 'https://cdn.shopify.com/s/files/1/0533/2085/files/coconut-soap-bf.jpg',
    usp_list: [
      '⚫ Black Friday',
      '💰 Prix cassés',
      '🎁 Cadeau offert',
      '⏰ 24h seulement'
    ],
    cta_primary: '⚫ BLACK FRIDAY - ACHETER',
    cta_secondary: 'Voir l\'offre',
    badges: [
      'BLACK FRIDAY',
      'EXCLUSIF',
      '24H'
    ],
    campaign_ref: 'BF-EXCLUSIF',
    theme_fingerprint: 'horizon-theme-v1'
  }
};

/**
 * Créer une variante via l'API
 */
async function createVariant(variantHandle, variantData) {
  try {
    console.log(`🎯 Création de la variante: ${variantHandle}`);
    
    const response = await fetch(`${BACKEND_URL}/adlign-variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shop: SHOP,
        product_id: PRODUCT_ID,
        variant_handle: variantHandle,
        variant_data: variantData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Variante ${variantHandle} créée avec succès:`, result.message);
    return result;
    
  } catch (error) {
    console.error(`❌ Erreur création variante ${variantHandle}:`, error.message);
    return null;
  }
}

/**
 * Récupérer toutes les variantes d'un produit
 */
async function getVariants() {
  try {
    console.log(`📖 Récupération des variantes pour le produit ${PRODUCT_ID}`);
    
    const response = await fetch(`${BACKEND_URL}/adlign-variants/${PRODUCT_ID}?shop=${SHOP}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Variantes récupérées:`, result.data);
    return result.data;
    
  } catch (error) {
    console.error(`❌ Erreur récupération variantes:`, error.message);
    return null;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Test de l\'API Adlign Variants');
  console.log('=====================================');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Shop: ${SHOP}`);
  console.log(`Produit: ${PRODUCT_ID}`);
  console.log('');

  // Vérifier que le backend est accessible
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error('Backend non accessible');
    }
    console.log('✅ Backend accessible');
  } catch (error) {
    console.error('❌ Backend non accessible:', error.message);
    console.log('💡 Assurez-vous que le backend est démarré avec: npm run dev');
    return;
  }

  console.log('');

  // Créer les variantes une par une
  for (const [variantHandle, variantData] of Object.entries(variants)) {
    await createVariant(variantHandle, variantData);
    console.log('');
  }

  // Récupérer toutes les variantes pour vérifier
  console.log('🔍 Vérification des variantes créées...');
  await getVariants();

  console.log('');
  console.log('🎉 Test terminé !');
  console.log('');
  console.log('💡 Pour tester l\'extension:');
  console.log(`   - Page normale: https://${SHOP}/products/echantillon-savon-a-barres-de-noix-de-coco`);
  console.log(`   - Avec variante test: https://${SHOP}/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=test`);
  console.log(`   - Avec variante promo: https://${SHOP}/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=promo`);
  console.log(`   - Avec variante blackfriday: https://${SHOP}/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=blackfriday`);
}

// Exécuter le script
main().catch(console.error);
