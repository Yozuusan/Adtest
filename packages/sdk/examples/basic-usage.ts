// Exemple d'utilisation basique du SDK Adlign

import { AdlignClient } from '../src';

async function basicUsageExample() {
  console.log('🚀 Démarrage de l\'exemple d\'utilisation du SDK Adlign...\n');

  // 1. Initialisation du client
  const client = new AdlignClient({
    baseURL: 'https://api.adlign.com',
    timeout: 30000,
    apiKey: 'your-api-key'
  });

  console.log('✅ Client initialisé');

  // 2. Vérification de la santé de l'API
  try {
    const health = await client.healthCheck();
    console.log('✅ Health check:', health);
  } catch (error) {
    console.log('⚠️ Health check échoué (normal en développement):', error.message);
  }

  // 3. Exemple de création de variante
  const variantExample = {
    title: {
      type: 'text' as const,
      value: 'Nouveau titre produit',
      priority: 1
    },
    image: {
      type: 'image' as const,
      src: 'https://example.com/image.jpg',
      w: 800,
      h: 600
    },
    cta: {
      type: 'cta' as const,
      value: 'Acheter maintenant',
      priority: 2
    }
  };

  console.log('📝 Exemple de variante créé:', JSON.stringify(variantExample, null, 2));

  // 4. Exemple d'événement analytics
  const analyticsExample = {
    event_type: 'variant_view' as const,
    variant_id: 'variant-123',
    product_gid: 'gid://shopify/Product/123456789',
    campaign_ref: 'campaign-123',
    user_agent: 'Mozilla/5.0 (example)'
  };

  console.log('📊 Exemple d\'événement analytics créé:', JSON.stringify(analyticsExample, null, 2));

  // 5. Exemple d'adaptateur de thème
  console.log('🎨 Exemple d\'adaptateur de thème:');
  console.log('- getThemeAdapter("product-handle", "variant-handle")');
  console.log('- buildThemeAdapter("https://shop.myshopify.com/products/product", "shop-id")');

  console.log('\n🎉 Exemple terminé avec succès !');
  console.log('\n📚 Pour plus d\'informations, consultez le README.md');
}

// Exécution de l'exemple
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };
