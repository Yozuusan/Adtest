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
   * Récupère le metafield adlign_data.settings d'un produit
   */
  async getProductAdlignSettings(shop: string, productId: number): Promise<any> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
    }

      const url = `https://${shop}/admin/api/2024-07/products/${productId}/metafields.json?namespace=adlign_data&key=settings`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token.access_token,
      },
    });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Metafield n'existe pas encore
      }
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
    }

      const result = await response.json() as any;
      if (result.metafields && result.metafields.length > 0) {
        try {
          return JSON.parse(result.metafields[0].value);
      } catch (e) {
          return result.metafields[0].value;
      }
    }
      
      return null;
  } catch (error) {
      throw createError(`Failed to get product metafield: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
  }

  /**
   * Met à jour le metafield adlign_data.settings d'un produit
   */
  async updateProductAdlignSettings(shop: string, productId: number, settings: any): Promise<ProductMetafield> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
    }

      // Vérifier si le metafield existe déjà
      const existingSettings = await this.getProductAdlignSettings(shop, productId);
      
      let url: string;
      let method: string;
      let payload: any;

      if (existingSettings) {
        // Mettre à jour le metafield existant
        const metafieldId = await this.getMetafieldId(shop, productId, 'adlign_data', 'settings');
        url = `https://${shop}/admin/api/2024-07/metafields.json`;
        method = 'PUT';
        payload = {
          metafield: {
            value: JSON.stringify(settings)
        }
      };
    } else {
        // Créer un nouveau metafield
        url = `https://${shop}/admin/api/2024-07/metafields.json`;
        method = 'POST';
        payload = {
          metafield: {
            namespace: 'adlign_data',
            key: 'settings',
            value: JSON.stringify(settings),
            type: 'json_string',
            owner_resource: 'product',
            owner_id: productId
        }
      };
    }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
      },
        body: JSON.stringify(payload),
    });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
    }

      const result = await response.json() as any;
      return result.metafield;
  } catch (error) {
      throw createError(`Failed to update product metafield: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
  }

  /**
   * Ajoute une variante Adlign au produit
   */
  async addAdlignVariant(
    shop: string, 
    productId: number, 
    variantHandle: string, 
    variantData: AdlignVariant
  ): Promise<any> {
    try {
      console.log(`🎯 [SHOPIFY] Ajout variante ${variantHandle} au produit ${productId}`);
      
      // Récupérer les settings actuels
      const currentSettings = await this.getProductAdlignSettings(shop, productId) || {};
      
      // Ajouter la nouvelle variante
      currentSettings[variantHandle] = variantData;
      
      // Mettre à jour le metafield
      const result = await this.updateProductAdlignSettings(shop, productId, currentSettings);
      
      console.log(`✅ [SHOPIFY] Variante ${variantHandle} ajoutée avec succès`);
      
      return {
        success: true,
        variant_handle: variantHandle,
        metafield: result,
        message: `Variante ${variantHandle} ajoutée au produit ${productId}`
    };
  } catch (error) {
      console.error(`❌ [SHOPIFY] Erreur ajout variante ${variantHandle}:`, error);
      throw createError(`Failed to add Adlign variant: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
  }

  /**
   * Récupère l'ID d'un metafield spécifique
   */
  private async getMetafieldId(shop: string, productId: number, namespace: string, key: string): Promise<number> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
    }
      
      const url = `https://${shop}/admin/api/2024-07/products/${productId}/metafields.json?namespace=${namespace}&key=${key}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token.access_token,
      },
    });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
    }

      const result = await response.json() as any;
      if (result.metafields && result.metafields.length > 0) {
        return result.metafields[0].id;
    }
      
      throw new Error('Metafield not found');
  } catch (error) {
      throw createError(`Failed to get metafield ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
  }

  /**
   * Crée ou met à jour un metaobject
   */
  async createOrUpdateMetaobject(
    shop: string,
    type: string,
    fields: Array<{ key: string; value: string | number | boolean }>,
    handle?: string
  ): Promise<ShopifyMetaobject> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
    }

      const url = `https://${shop}/admin/api/2024-07/metafields.json`;
      const payload = {
        metafield: {
          namespace: 'adlign_data',
          key: handle || 'variant',
          value: JSON.stringify(fields),
          type: 'json_string'
      }
    };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
      },
        body: JSON.stringify(payload),
    });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
    }

      const result = await response.json() as any;
      return {
        id: result.metafield.id,
        handle: result.metafield.handle || '',
        value: result.metafield.value,
        type: result.metafield.type,
        fields
      };
  } catch (error) {
      throw createError(`Failed to create/update metaobject: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Upload un fichier vers Shopify
   */
  async uploadFileToShopify(
    shop: string,
    fileUrl: string,
    alt?: string
  ): Promise<ShopifyFile> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
      }

      const url = `https://${shop}/admin/api/2024-07/files.json`;
      const payload = {
        file: {
          url: fileUrl,
          alt: alt || 'Adlign generated image'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
      }

      const result = await response.json() as any;
      return {
        id: result.file.id,
        url: result.file.url,
        alt: result.file.alt
      };
    } catch (error) {
      throw createError(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
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
   * Récupérer un variant par handle
   */
  async getVariantByHandle(shop: string, handle: string): Promise<any> {
    const token = await getShopToken(shop);
    if (!token) {
      throw new Error('Shop not authenticated');
    }

    const query = `
      query getMetaobjectByHandle($type: String!, $handle: String!) {
        metaobjects(type: $type, first: 1, query: $handle) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ query, variables: { type: "adlign_variant", handle } }),
      });

      const result = await response.json() as any;
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return null;
      }

      const metaobjects = result.data?.metaobjects?.edges || [];
      if (metaobjects.length === 0) return null;

      const metaobject = metaobjects[0].node;
      
      // Convertir les fields en objet
      const fieldsObj: any = {};
      metaobject.fields.forEach((field: any) => {
        fieldsObj[field.key] = field.value;
      });

      return {
        id: metaobject.id,
        handle: metaobject.handle,
        ...fieldsObj
      };
    } catch (error) {
      console.error('Error fetching variant:', error);
      return null;
    }
  }

  /**
   * Récupérer tous les variants d'un shop
   */
  async getAllVariants(shop: string): Promise<any[]> {
    const token = await getShopToken(shop);
    if (!token) {
      throw new Error('Shop not authenticated');
    }

    const query = `
      query getMetaobjects {
        metaobjects(type: "adlign_variant", first: 250) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json() as any;
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return [];
      }

      const metaobjects = result.data?.metaobjects?.edges || [];
      
      return metaobjects.map((edge: any) => {
        const metaobject = edge.node;
        const fieldsObj: any = {};
        metaobject.fields.forEach((field: any) => {
          fieldsObj[field.key] = field.value;
        });

        return {
          id: metaobject.id,
          handle: metaobject.handle,
          ...fieldsObj
        };
      });
    } catch (error) {
      console.error('Error fetching variants:', error);
      return [];
    }
  }

  /**
   * Récupère les produits avec l'API GraphQL moderne (remplace l'API REST dépréciée)
   */
  async getProducts(shop: string, query: string = '', limit: number = 20): Promise<any[]> {
    const token = await this.getToken(shop);
    if (!token) {
      throw new Error('Shop not authenticated');
    }

    const graphQLQuery = `
      query getProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              handle
              title
              status
              createdAt
              updatedAt
              productType
              vendor
              tags
              featuredImage {
                id
                url
                altText
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    compareAtPrice
                    sku
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ 
          query: graphQLQuery, 
          variables: { 
            first: limit,
            query: query || null
          }
        }),
      });

      const result = await response.json() as any;
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return [];
      }

      const products = result.data?.products?.edges || [];
      
      return products.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id.replace('gid://shopify/Product/', ''), // Extract numeric ID
          gid: node.id,
          handle: node.handle,
          title: node.title,
          status: node.status,
          created_at: node.createdAt,
          updated_at: node.updatedAt,
          product_type: node.productType,
          vendor: node.vendor,
          tags: node.tags,
          featured_image: node.featuredImage ? {
            id: node.featuredImage.id,
            src: node.featuredImage.url,
            alt: node.featuredImage.altText
          } : null,
          variants: node.variants.edges.map((variantEdge: any) => {
            const variant = variantEdge.node;
            return {
              id: variant.id.replace('gid://shopify/ProductVariant/', ''),
              gid: variant.id,
              title: variant.title,
              price: variant.price,
              compare_at_price: variant.compareAtPrice,
              sku: variant.sku,
              inventory_quantity: variant.inventoryQuantity
            };
          })
        };
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  /**
   * Récupérer un produit spécifique par ID (GraphQL)
   */
  async getProduct(shop: string, productId: string): Promise<any | null> {
    const token = await this.getToken(shop);
    if (!token) {
      throw new Error('Shop not authenticated');
    }

    const graphQLQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          handle
          title
          description
          descriptionHtml
          status
          createdAt
          updatedAt
          productType
          vendor
          tags
          images(first: 50) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({
          query: graphQLQuery,
          variables: { id: `gid://shopify/Product/${productId}` },
        }),
      });

      if (!response.ok) {
        throw new Error(`Shopify GraphQL API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return null;
      }

      const product = result.data?.product;
      if (!product) return null;

      return {
        id: product.id.replace('gid://shopify/Product/', ''),
        gid: product.id,
        handle: product.handle,
        title: product.title,
        description: product.description,
        description_html: product.descriptionHtml,
        status: product.status,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        product_type: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        images: product.images.edges.map((edge: any) => ({
          id: edge.node.id,
          src: edge.node.url,
          alt: edge.node.altText,
          width: edge.node.width,
          height: edge.node.height
        })),
        variants: product.variants.edges.map((edge: any) => {
          const variant = edge.node;
          return {
            id: variant.id.replace('gid://shopify/ProductVariant/', ''),
            gid: variant.id,
            title: variant.title,
            price: variant.price,
            compare_at_price: variant.compareAtPrice,
            sku: variant.sku,
            inventory_quantity: variant.inventoryQuantity,
            selected_options: variant.selectedOptions
          };
        }),
        product_url: `https://${shop}/products/${product.handle}`
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  /**
   * Supprimer un variant par handle
   */
  async deleteVariantByHandle(shop: string, handle: string): Promise<boolean> {
    const variant = await this.getVariantByHandle(shop, handle);
    if (!variant) return false;

    const token = await getShopToken(shop);
    if (!token) {
      throw new Error('Shop not authenticated');
    }

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

    try {
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
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return false;
      }

      const deleteResult = result.data?.metaobjectDelete;
      if (deleteResult?.userErrors?.length > 0) {
        console.error('Delete errors:', deleteResult.userErrors);
        return false;
      }

      return !!deleteResult?.deletedId;
    } catch (error) {
      console.error('Error deleting variant:', error);
      return false;
    }
  }

  /**
   * Ensure metaobject definition exists
   */
  async ensureMetaobjectDefinition(shop: string): Promise<boolean> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        return false;
      }

      // Vérifier si la définition existe déjà
      const checkQuery = `
        query {
          metaobjectDefinitions(first: 10) {
            edges {
              node {
                id
                type
                name
              }
            }
          }
        }
      `;

      const checkResponse = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ query: checkQuery }),
      });

      const checkResult = await checkResponse.json() as any;
      const definitions = checkResult.data?.metaobjectDefinitions?.edges || [];
      const existingDef = definitions.find((def: any) => def.node.type === 'adlign_variant');

      if (existingDef) {
        console.log('✅ Metaobject definition adlign_variant already exists');
        return true;
      }

      // Créer la définition si elle n'existe pas
      const createMutation = `
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

      const variables = {
        definition: {
          type: 'adlign_variant',
          name: 'Adlign Variant',
          description: 'Dynamic content variants for Adlign campaigns',
          fieldDefinitions: [
            { key: 'product_gid', name: 'Product GID', type: 'single_line_text_field' },
            { key: 'handle', name: 'Handle', type: 'single_line_text_field' },
            { key: 'content_json', name: 'Content JSON', type: 'multi_line_text_field' },
            { key: 'created_at', name: 'Created At', type: 'date_time' }
          ]
        }
      };

      const createResponse = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify({ query: createMutation, variables }),
      });

      const createResult = await createResponse.json() as any;
      
      if (createResult.errors) {
        console.error('Failed to create metaobject definition:', createResult.errors);
        return false;
      }

      const definitionResult = createResult.data?.metaobjectDefinitionCreate;
      if (definitionResult?.userErrors?.length > 0) {
        console.error('Metaobject definition creation errors:', definitionResult.userErrors);
        return false;
      }

      console.log('✅ Metaobject definition adlign_variant created successfully');
      return true;
    } catch (error) {
      console.error('Error ensuring metaobject definition:', error);
      return false;
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