import { createError } from '../middleware/errorHandler';
import { Redis } from '@upstash/redis';
import { saveShopToken, getShopToken, type ShopToken } from './tokens';
import { getShopifyRedirectUrl } from '../config/urls';

// Types Shopify
interface ShopifyToken {
  access_token: string;
  scope: string;
  shop: string;
  expires_in?: number;
}

interface ShopifyMetaobject {
  id: string;
  handle: string;
  type: string;
  value?: string;
  fields: Array<{
    key: string;
    value: string | number | boolean;
  }>;
}

interface ShopifyFile {
  id: string;
  url: string;
  alt?: string;
}

interface ProductMetafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  owner_resource: string;
  owner_id: number;
}

interface AdlignVariant {
  title: string;
  subtitle?: string;
  description_html?: string;
  hero_image?: string;
  usp_list?: string[];
  cta_primary: string;
  cta_secondary?: string;
  badges?: string[];
  campaign_ref: string;
  theme_fingerprint?: string;
}

export class ShopifyService {
  private redis: Redis;
  private _apiKey: string | undefined;
  private _apiSecret: string | undefined;
  private _appUrl: string | undefined;

  constructor() {
    console.log('🔧 ShopifyService constructor - Variables d\'environnement:');
    console.log('  SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? '✅ défini' : '❌ undefined');
    console.log('  SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? '✅ défini' : '❌ undefined');
    console.log('  APP_URL:', process.env.APP_URL ? '✅ défini' : '❌ undefined');
    console.log('  UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ défini' : '❌ undefined');
    
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
  });
  }

  private get apiKey(): string {
    if (!this._apiKey) {
      this._apiKey = process.env.SHOPIFY_API_KEY;
      if (!this._apiKey) {
        throw new Error('SHOPIFY_API_KEY environment variable is not defined');
    }
  }
    return this._apiKey;
  }

  private get apiSecret(): string {
    if (!this._apiSecret) {
      this._apiSecret = process.env.SHOPIFY_API_SECRET;
      if (!this._apiSecret) {
        throw new Error('SHOPIFY_API_SECRET environment variable is not defined');
    }
  }
    return this._apiSecret;
  }

  private get appUrl(): string {
    if (!this._appUrl) {
      this._appUrl = process.env.APP_URL || 'https://api.adlign.com';
      if (!this._appUrl) {
        throw new Error('APP_URL environment variable is not defined');
    }
  }
    return this._appUrl;
  }

  /**
   * Génère l'URL d'installation OAuth
   */
  generateInstallUrl(shop: string, userId?: string, scopes: string[] = [
    'read_analytics', 'read_checkouts', 'read_customers', 'read_files', 'read_inventory', 
    'read_locations', 'read_metaobjects', 'read_metaobject_definitions', 'read_orders', 
    'read_product_listings', 'read_products', 'read_shipping', 'read_themes', 
    'write_files', 'write_metaobjects', 'write_metaobject_definitions', 'write_products', 'write_themes'
  ]): string {
    const scope = scopes.join(',');
    
    // 🔧 FIX: Utiliser la configuration centralisée des URLs
    const redirectUri = getShopifyRedirectUrl();
    
    console.log(`🔗 OAuth redirect_uri: ${redirectUri}`);
    
    // Utiliser le userId comme state si fourni, sinon générer un state random
    const state = userId || this.generateState(shop);
    
    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope,
      redirect_uri: redirectUri,
      state
    });

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre un token
   */
  async exchangeCodeForToken(code: string, shop: string): Promise<ShopifyToken> {
    try {
      const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code,
      }),
    });

      if (!response.ok) {
        throw new Error(`Shopify OAuth error: ${response.statusText}`);
    }

      const tokenData = await response.json() as ShopifyToken;
      
      console.log(`🔑 Token received from Shopify:`, JSON.stringify(tokenData, null, 2));
      
      // Stocker le token en cache
      await this.storeToken(shop, tokenData);
      
      return tokenData;
  } catch (error) {
      throw createError(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
  }

  /**
   * Vérifier si le snippet Adlign est déployé sur le thème principal
   */
  async isAdlignSnippetDeployed(shop: string): Promise<{ deployed: boolean; themeId?: string; missingFiles?: string[] }> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw new Error('Shop not authenticated');
      }

      // 1. Récupérer le thème principal actif
      const themesResponse = await fetch(`https://${shop}/admin/api/2024-07/themes.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token.access_token,
        },
      });

      if (!themesResponse.ok) {
        throw new Error(`Failed to fetch themes: ${themesResponse.statusText}`);
      }

      const themesData = await themesResponse.json() as any;
      const mainTheme = themesData.themes.find((theme: any) => theme.role === 'main');
      
      if (!mainTheme) {
        throw new Error('No main theme found');
      }

      console.log(`🎨 Found main theme: ${mainTheme.name} (ID: ${mainTheme.id})`);

      // 2. Vérifier si les fichiers Adlign existent
      const assetsResponse = await fetch(`https://${shop}/admin/api/2024-07/themes/${mainTheme.id}/assets.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token.access_token,
        },
      });

      if (!assetsResponse.ok) {
        throw new Error(`Failed to fetch theme assets: ${assetsResponse.statusText}`);
      }

      const assetsData = await assetsResponse.json() as any;
      const assets = assetsData.assets || [];
      
      // Fichiers Adlign requis
      const requiredFiles = [
        'snippets/adlign_metaobject_injector.liquid',
        'assets/adlign-micro-kernel.js'
      ];

      const missingFiles: string[] = [];
      const existingFiles: string[] = [];

      for (const file of requiredFiles) {
        const exists = assets.some((asset: any) => asset.key === file);
        if (exists) {
          existingFiles.push(file);
          console.log(`✅ Found Adlign file: ${file}`);
        } else {
          missingFiles.push(file);
          console.log(`❌ Missing Adlign file: ${file}`);
        }
      }

      const deployed = missingFiles.length === 0;
      
      return {
        deployed,
        themeId: mainTheme.id,
        missingFiles: deployed ? undefined : missingFiles
      };

    } catch (error) {
      console.error('Error checking Adlign snippet deployment:', error);
      return { deployed: false };
    }
  }

  /**
   * Déployer automatiquement le snippet Adlign sur le thème principal
   */
  async deployAdlignSnippet(shop: string): Promise<{ success: boolean; deployedFiles?: string[]; error?: string }> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw new Error('Shop not authenticated');
      }

      // 1. Vérifier le status actuel
      const status = await this.isAdlignSnippetDeployed(shop);
      if (status.deployed) {
        console.log('✅ Adlign snippet already deployed');
        return { success: true, deployedFiles: [] };
      }

      if (!status.themeId) {
        throw new Error('Could not determine main theme ID');
      }

      console.log(`🚀 Deploying Adlign snippet to theme ${status.themeId}...`);

      // 2. Define simple content for testing
      const snippetContent = `{% comment %}
  Adlign Metaobject Injector - Test Version
{% endcomment %}

{% assign adlign_variant = request.url | split: 'av=' | last | split: '&' | first %}

{% if adlign_variant and adlign_variant != '' %}
  <div id="adlign-test-content" style="border: 2px solid #0ea5e9; padding: 20px; margin: 20px 0; background: #f0f9ff;">
    <h3 style="color: #0369a1; margin-top: 0;">Adlign Test Snippet Active</h3>
    <p><strong>Variant:</strong> {{ adlign_variant }}</p>
    <p><strong>Shop:</strong> {{ shop.domain }}</p>
    <p><strong>Product:</strong> {{ product.handle | default: 'none' }}</p>
    <p><em>This is a test deployment. The micro-kernel will be loaded next.</em></p>
  </div>
  
  <script src="{{ 'adlign-micro-kernel.js' | asset_url }}" defer></script>
{% endif %}`;

      const jsContent = `// Adlign Micro-kernel Test Version
console.log('🚀 Adlign micro-kernel test version loaded');

window.AdlignMicroKernel = {
  version: '1.0.0-test',
  
  init: function() {
    console.log('🔧 Initializing Adlign micro-kernel test...');
    
    const testDiv = document.getElementById('adlign-test-content');
    if (testDiv) {
      testDiv.innerHTML += '<p style="color: #059669; font-weight: bold;">✅ Micro-kernel loaded successfully!</p>';
    }
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.AdlignMicroKernel.init);
} else {
  window.AdlignMicroKernel.init();
}`;

      const deployedFiles: string[] = [];

      // 3. Deploy snippet file
      if (status.missingFiles?.includes('snippets/adlign_metaobject_injector.liquid')) {
        console.log('🔧 Deploying Liquid snippet...');
        
        const snippetResponse = await fetch(`https://${shop}/admin/api/2024-07/themes/${status.themeId}/assets.json`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token.access_token,
          },
          body: JSON.stringify({
            asset: {
              key: 'snippets/adlign_metaobject_injector.liquid',
              value: snippetContent
            }
          }),
        });

        if (!snippetResponse.ok) {
          const error = await snippetResponse.text();
          console.error('❌ Snippet deployment failed:', {
            status: snippetResponse.status,
            statusText: snippetResponse.statusText,
            error,
            themeId: status.themeId,
            shop,
            url: `https://${shop}/admin/api/2024-07/themes/${status.themeId}/assets.json`
          });
          
          let errorMessage = `Failed to deploy snippet (${snippetResponse.status})`;
          
          if (snippetResponse.status === 404) {
            errorMessage += ': Theme not found. Please verify the theme ID is correct.';
          } else if (snippetResponse.status === 401) {
            errorMessage += ': Authentication failed. Please verify the access token is valid.';
          } else if (snippetResponse.status === 403) {
            errorMessage += ': Permission denied. Please verify the token has write_themes scope.';
          } else if (error.includes('Not Found')) {
            errorMessage += ': API endpoint not found. Please verify the theme ID and API version.';
          }
          
          throw new Error(`${errorMessage} Error: ${error}`);
        }

        deployedFiles.push('snippets/adlign_metaobject_injector.liquid');
        console.log('✅ Deployed adlign_metaobject_injector.liquid');
      }

      // 4. Deploy JavaScript file
      if (status.missingFiles?.includes('assets/adlign-micro-kernel.js')) {
        console.log('🔧 Deploying JavaScript micro-kernel...');
        
        const jsResponse = await fetch(`https://${shop}/admin/api/2024-07/themes/${status.themeId}/assets.json`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token.access_token,
          },
          body: JSON.stringify({
            asset: {
              key: 'assets/adlign-micro-kernel.js',
              value: jsContent
            }
          }),
        });

        if (!jsResponse.ok) {
          const error = await jsResponse.text();
          console.error('❌ JavaScript deployment failed:', {
            status: jsResponse.status,
            statusText: jsResponse.statusText,
            error,
            themeId: status.themeId,
            shop
          });
          
          let errorMessage = `Failed to deploy micro-kernel (${jsResponse.status})`;
          
          if (jsResponse.status === 404) {
            errorMessage += ': Theme not found. Please verify the theme ID is correct.';
          } else if (jsResponse.status === 401) {
            errorMessage += ': Authentication failed. Please verify the access token is valid.';
          } else if (jsResponse.status === 403) {
            errorMessage += ': Permission denied. Please verify the token has write_themes scope.';
          }
          
          throw new Error(`${errorMessage} Error: ${error}`);
        }

        deployedFiles.push('assets/adlign-micro-kernel.js');
        console.log('✅ Deployed adlign-micro-kernel.js');
      }

      console.log(`🎉 Adlign snippet deployment completed! Files deployed: ${deployedFiles.join(', ')}`);
      
      return { 
        success: true, 
        deployedFiles 
      };

    } catch (error) {
      console.error('Error deploying Adlign snippet:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Auto-déployer le snippet si nécessaire lors de la création d'une variante
   */
  async autoDeploySnippetIfNeeded(shop: string): Promise<boolean> {
    try {
      const status = await this.isAdlignSnippetDeployed(shop);
      
      if (!status.deployed) {
        console.log('🔧 Auto-deploying Adlign snippet...');
        const deployment = await this.deployAdlignSnippet(shop);
        
        if (!deployment.success) {
          console.error('❌ Failed to auto-deploy snippet:', deployment.error);
          return false;
        }
        
        console.log('✅ Auto-deployment successful');
        return true;
      }
      
      console.log('✅ Snippet already deployed');
      return true;
      
    } catch (error) {
      console.error('❌ Error in auto-deployment:', error);
      return false;
    }
  }

  /**
   * Deploy template file to Shopify theme
   */
  async deployTemplate(shop: string, templateKey: string, templateContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw new Error('Shop not authenticated');
      }

      // Get the main theme ID
      const status = await this.isAdlignSnippetDeployed(shop);
      if (!status.themeId) {
        throw new Error('Could not determine main theme ID');
      }

      console.log(`🚀 Deploying template ${templateKey} to theme ${status.themeId}...`);

      const response = await fetch(`https://${shop}/admin/api/2024-07/themes/${status.themeId}/assets.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({
          asset: {
            key: templateKey,
            value: templateContent
          }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Template deployment failed:', {
          status: response.status,
          statusText: response.statusText,
          error,
          themeId: status.themeId,
          shop,
          templateKey
        });
        
        let errorMessage = `Failed to deploy template (${response.status})`;
        
        if (response.status === 404) {
          errorMessage += ': Theme not found. Please verify the theme ID is correct.';
        } else if (response.status === 401) {
          errorMessage += ': Authentication failed. Please verify the access token is valid.';
        } else if (response.status === 403) {
          errorMessage += ': Insufficient permissions. Please verify write_themes scope.';
        }
        
        throw new Error(errorMessage);
      }

      console.log(`✅ Successfully deployed template: ${templateKey}`);
      
      return { success: true };

    } catch (error) {
      console.error('Error deploying template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Vérifie si une boutique est authentifiée
   */
  async isShopAuthenticated(shop: string): Promise<boolean> {
    const token = await getShopToken(shop);
    return !!token;
  }

  /**
   * Récupère le token d'une boutique
   */
  private async getToken(shop: string): Promise<ShopifyToken | null> {
    const token = await getShopToken(shop);
    if (!token) return null;
    
    // Convertir ShopToken vers ShopifyToken
    return {
      access_token: token.access_token,
      scope: token.scope || '',
      shop: shop,
      expires_in: undefined // ShopToken n'a pas cette propriété
    };
  }

  /**
   * Stocke le token d'une boutique
   */
  private async storeToken(shop: string, token: ShopifyToken): Promise<void> {
    await saveShopToken(shop, token);
  }

  /**
   * Set a metafield for a product (used by variants route)
   */
  async setProductMetafield(shop: string, productId: string, namespace: string, key: string, value: string): Promise<boolean> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw new Error('Shop not authenticated');
      }

      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [{
          ownerId: productId,
          namespace,
          key,
          value,
          type: 'json'
        }]
      };

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const result = await response.json() as any;
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return false;
      }

      if (result.data?.metafieldsSet?.userErrors?.length > 0) {
        console.error('Metafield set errors:', result.data.metafieldsSet.userErrors);
        return false;
      }

      console.log(`✅ Metafield saved: ${namespace}.${key} for product ${productId}`);
      return true;
    } catch (error) {
      console.error('Error setting metafield:', error);
      return false;
    }
  }

  /**
   * Add an Adlign variant (metaobject)
   */
  async addAdlignVariant(shop: string, productId: number, variantHandle: string, variantData: any): Promise<any> {
    const metaobjectData = {
      handle: variantHandle,
      fields: {
        product_id: productId.toString(),
        ...variantData
      }
    };
    return this.createOrUpdateMetaobject(shop, metaobjectData);
  }

  /**
   * Get product Adlign settings
   */
  async getProductAdlignSettings(shop: string, productId: string | number): Promise<any> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            metafields(first: 20, namespace: "adlign") {
              nodes {
                key
                value
                type
              }
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query, 
          variables: { id: typeof productId === 'number' ? `gid://shopify/Product/${productId}` : productId } 
        }),
      });

      const result = await response.json() as any;
      return result.data?.product || null;
    } catch (error) {
      console.error('Error getting product settings:', error);
      return null;
    }
  }

  /**
   * Update product Adlign settings
   */
  async updateProductAdlignSettings(shop: string, productId: string | number, settings: any): Promise<boolean> {
    try {
      return await this.setProductMetafield(shop, typeof productId === 'number' ? productId.toString() : productId, 'adlign', 'settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error updating product settings:', error);
      return false;
    }
  }

  /**
   * Get products list
   */
  async getProducts(shop: string, limit = 50): Promise<any[]> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      const query = `
        query getProducts($first: Int!) {
          products(first: $first) {
            nodes {
              id
              title
              handle
              status
              featuredImage {
                url
                altText
              }
              createdAt
              updatedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query, 
          variables: { first: limit } 
        }),
      });

      const result = await response.json() as any;
      return result.data?.products?.nodes || [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  /**
   * Get single product
   */
  async getProduct(shop: string, productId: string): Promise<any> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            description
            status
            productType
            vendor
            tags
            featuredImage {
              url
              altText
            }
            images(first: 10) {
              nodes {
                id
                url
                altText
              }
            }
            variants(first: 10) {
              nodes {
                id
                title
                price
                availableForSale
              }
            }
            metafields(first: 20) {
              nodes {
                namespace
                key
                value
                type
              }
            }
            createdAt
            updatedAt
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query, 
          variables: { id: productId } 
        }),
      });

      const result = await response.json() as any;
      return result.data?.product || null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }

  /**
   * Get variant by handle from metafields
   */
  async getVariantByHandleFromMetafields(shop: string, handle: string): Promise<any> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      const query = `
        query getMetaobjects($type: String!, $first: Int!) {
          metaobjects(type: $type, first: $first) {
            nodes {
              id
              handle
              fields {
                key
                value
              }
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query, 
          variables: { 
            type: 'adlign_variant',
            first: 250 
          } 
        }),
      });

      const result = await response.json() as any;
      const metaobjects = result.data?.metaobjects?.nodes || [];
      
      return metaobjects.find((obj: any) => obj.handle === handle) || null;
    } catch (error) {
      console.error('Error getting variant by handle:', error);
      return null;
    }
  }

  /**
   * Get all variants
   */
  async getAllVariants(shop: string): Promise<any[]> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      const query = `
        query getMetaobjects($type: String!, $first: Int!) {
          metaobjects(type: $type, first: $first) {
            nodes {
              id
              handle
              fields {
                key
                value
              }
              createdAt
              updatedAt
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query, 
          variables: { 
            type: 'adlign_variant',
            first: 250 
          } 
        }),
      });

      const result = await response.json() as any;
      return result.data?.metaobjects?.nodes || [];
    } catch (error) {
      console.error('Error getting all variants:', error);
      return [];
    }
  }

  /**
   * Create or update metaobject
   */
  async createOrUpdateMetaobject(shop: string, metaobjectData: any): Promise<any> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      // First check if metaobject with this handle already exists
      const existingVariant = await this.getVariantByHandleFromMetafields(shop, metaobjectData.handle);
      
      if (existingVariant) {
        // Update existing metaobject
        const mutation = `
          mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
            metaobjectUpdate(id: $id, metaobject: $metaobject) {
              metaobject {
                id
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variables = {
          id: existingVariant.id,
          metaobject: {
            fields: Object.entries(metaobjectData.fields || {}).map(([key, value]) => ({
              key,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value)
            }))
          }
        };

        const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token.access_token,
          },
          body: JSON.stringify({ query: mutation, variables }),
        });

        const result = await response.json() as any;
        return result.data?.metaobjectUpdate?.metaobject;
      } else {
        // Create new metaobject
        const mutation = `
          mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
            metaobjectCreate(metaobject: $metaobject) {
              metaobject {
                id
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variables = {
          metaobject: {
            type: 'adlign_variant',
            handle: metaobjectData.handle,
            fields: Object.entries(metaobjectData.fields || {}).map(([key, value]) => ({
              key,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value)
            }))
          }
        };

        const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token.access_token,
          },
          body: JSON.stringify({ query: mutation, variables }),
        });

        const result = await response.json() as any;
        return result.data?.metaobjectCreate?.metaobject;
      }
    } catch (error) {
      console.error('Error creating/updating metaobject:', error);
      throw error;
    }
  }

  /**
   * Delete variant by handle
   */
  async deleteVariantByHandle(shop: string, handle: string): Promise<boolean> {
    try {
      const variant = await this.getVariantByHandleFromMetafields(shop, handle);
      if (!variant) return false;

      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      const mutation = `
        mutation metaobjectDelete($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query: mutation, 
          variables: { id: variant.id } 
        }),
      });

      const result = await response.json() as any;
      return !!result.data?.metaobjectDelete?.deletedId;
    } catch (error) {
      console.error('Error deleting variant:', error);
      return false;
    }
  }

  /**
   * Ensure metaobject definition exists
   */
  async ensureMetaobjectDefinition(shop: string, definitionData: any): Promise<any> {
    try {
      const token = await this.getToken(shop);
      if (!token) throw new Error('Shop not authenticated');

      // First check if definition already exists
      const query = `
        query getMetaobjectDefinition($type: String!) {
          metaobjectDefinition(type: $type) {
            id
            type
            name
          }
        }
      `;

      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query, 
          variables: { type: definitionData.type } 
        }),
      });

      const result = await response.json() as any;
      
      if (result.data?.metaobjectDefinition) {
        return result.data.metaobjectDefinition;
      }

      // Create new definition if it doesn't exist
      const mutation = `
        mutation metaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
          metaobjectDefinitionCreate(definition: $definition) {
            metaobjectDefinition {
              id
              type
              name
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const createResponse = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query: mutation, 
          variables: { definition: definitionData } 
        }),
      });

      const createResult = await createResponse.json() as any;
      return createResult.data?.metaobjectDefinitionCreate?.metaobjectDefinition;
    } catch (error) {
      console.error('Error ensuring metaobject definition:', error);
      throw error;
    }
  }

  /**
   * Récupérer les produits d'une boutique
   */
  async getProducts(shop: string, options: { status?: string; limit?: number } = {}): Promise<any[]> {
    try {
      const { status = 'active', limit = 50 } = options;
      
      console.log(`📦 Fetching products for ${shop} (status: ${status}, limit: ${limit})`);
      
      const shopToken = await getShopToken(shop);
      if (!shopToken || !shopToken.access_token) {
        throw new Error(`No access token found for shop: ${shop}`);
      }
      
      const token = shopToken.access_token;

      // GraphQL query pour récupérer les produits
      const query = `
        query getProducts($first: Int!, $query: String) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                title
                handle
                status
                productType
                vendor
                tags
                createdAt
                updatedAt
                featuredImage {
                  url
                  altText
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
      
      const variables = {
        first: Math.min(limit, 250), // Shopify limite à 250
        query: status !== 'all' ? `status:${status}` : undefined
      };

      const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      // Transformer les données GraphQL en format plus simple
      const products = data.data.products.edges.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          status: node.status.toLowerCase(),
          product_type: node.productType,
          vendor: node.vendor,
          tags: node.tags.join(', '),
          created_at: node.createdAt,
          updated_at: node.updatedAt,
          image: node.featuredImage ? {
            src: node.featuredImage.url,
            alt: node.featuredImage.altText
          } : (node.images.edges.length > 0 ? {
            src: node.images.edges[0].node.url,
            alt: node.images.edges[0].node.altText
          } : null)
        };
      });

      console.log(`✅ Successfully fetched ${products.length} products for ${shop}`);
      return products;

    } catch (error) {
      console.error(`Error fetching products for ${shop}:`, error);
      throw error;
    }
  }

  /**
   * Génère un state sécurisé pour OAuth
   */
  private generateState(shop: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${shop}_${timestamp}_${random}`;
  }
}

// Instance singleton
export const shopifyService = new ShopifyService();