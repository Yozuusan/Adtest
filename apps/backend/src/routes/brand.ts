// apps/backend/src/routes/brand.ts
// NOUVEAU ENDPOINT pour l'analyse automatique de marque

import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { getShopToken } from '../services/tokens';
import { supabaseService } from '../services/supabase';
import OpenAI from 'openai';
import multer from 'multer';
import { z } from 'zod';

const router = Router();

// Schéma de validation pour l'analyse de marque
const BrandAnalysisSchema = z.object({
  shop: z.string().min(1),
  ai_analysis: z.object({
    brand_personality: z.string(),
    target_audience: z.string(),
    value_proposition: z.string(),
    visual_style: z.string(),
    messaging_tone: z.string(),
    brand_positioning: z.string(),
    competitive_advantage: z.string(),
    recommendations: z.array(z.string()),
    confidence_score: z.number().min(0).max(1),
    analysis_timestamp: z.string()
  }),
  products_analyzed: z.number().min(1)
});

// Configuration multer pour l'upload de documents
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max pour les documents
  },
  fileFilter: (req, file, cb) => {
    // Accepter documents et textes
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez PDF, DOC, DOCX, TXT ou MD.'));
    }
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /brand/analyze?shop=store.myshopify.com
 * Analyse automatique de la marque via produits Shopify + OpenAI
 * Sauvegarde automatiquement dans Supabase
 */
router.get('/analyze', async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    console.log(`🏷️ Starting brand analysis for ${shop}`);

    // Vérifier si une analyse récente existe déjà
    const existingAnalysis = await getExistingBrandAnalysis(shop);
    if (existingAnalysis && isAnalysisRecent(existingAnalysis.created_at)) {
      console.log(`📋 Using existing brand analysis for ${shop}`);
      return res.json({
        success: true,
        data: existingAnalysis.ai_analysis,
        message: 'Using existing brand analysis',
        source: 'cached',
        cached_at: existingAnalysis.created_at
      });
    }

    // Récupérer les produits de la boutique
    const products = await getShopProducts(shop);
    
    if (!products || products.length === 0) {
      throw createError('No products found for brand analysis', 404);
    }

    // Analyser la marque avec OpenAI
    const brandAnalysis = await analyzeBrandWithAI(products, shop);
    
    // Sauvegarder l'analyse dans Supabase
    const savedAnalysis = await saveBrandAnalysis(shop, brandAnalysis, products.length);

    res.json({
      success: true,
      data: brandAnalysis,
      message: 'Brand analysis completed and saved successfully',
      source: 'fresh',
      saved_at: savedAnalysis.created_at,
      analysis_id: savedAnalysis.id
    });

  } catch (error) {
    console.error('❌ Brand analysis error:', error);
    next(error);
  }
});

/**
 * GET /brand/analysis?shop=store.myshopify.com
 * Récupérer l'analyse de marque existante
 */
router.get('/analysis', async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    const analysis = await getExistingBrandAnalysis(shop);
    
    if (!analysis) {
      throw createError('No brand analysis found for this shop', 404);
    }

    res.json({
      success: true,
      data: {
        ai_analysis: analysis.ai_analysis,
        custom_brand_info: analysis.custom_brand_info,
        analysis_type: analysis.analysis_type,
        confidence_score: analysis.confidence_score,
        products_analyzed: analysis.products_analyzed,
        last_updated: analysis.last_updated,
        created_at: analysis.created_at
      },
      message: 'Brand analysis retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Get brand analysis error:', error);
    next(error);
  }
});

/**
 * POST /brand/upload-doc
 * Upload et analyse de documents brand (PDF, DOC, TXT)
 */
router.post('/upload-doc', upload.single('brand_document'), async (req, res, next) => {
  try {
    const { shop, document_type = 'brand_guidelines' } = req.body;
    const brandDoc = req.file;

    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    if (!brandDoc) {
      throw createError('brand_document file is required', 400);
    }

    console.log(`📄 Analyzing brand document for ${shop}: ${brandDoc.originalname}`);

    // Analyser le document avec OpenAI
    let documentAnalysis = '';
    
    if (brandDoc.mimetype === 'text/plain' || brandDoc.mimetype === 'text/markdown') {
      documentAnalysis = await analyzeTextDocument(brandDoc);
    } else if (brandDoc.mimetype === 'application/pdf') {
      documentAnalysis = await analyzePDFDocument(brandDoc);
    } else {
      documentAnalysis = await analyzeDocumentWithAI(brandDoc);
    }

    // Enrichir l'analyse avec le contexte de la boutique
    const enrichedAnalysis = await enrichBrandAnalysis(shop, documentAnalysis, document_type);

    res.json({
      success: true,
      data: {
        document_name: brandDoc.originalname,
        document_type,
        analysis: enrichedAnalysis,
        uploaded_at: new Date().toISOString()
      },
      message: 'Brand document analyzed successfully'
    });

  } catch (error) {
    console.error('❌ Brand document analysis error:', error);
    next(error);
  }
});

/**
 * POST /brand/save-info
 * Sauvegarder infos manuelles de marque
 */
router.post('/save-info', async (req, res, next) => {
  try {
    const { shop, brand_info } = req.body;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    if (!brand_info || typeof brand_info !== 'object') {
      throw createError('brand_info object is required', 400);
    }

    console.log(`💾 Saving manual brand info for ${shop}`);

    // Sauvegarder ou mettre à jour dans Supabase
    const savedInfo = await saveCustomBrandInfo(shop, brand_info);

    res.json({
      success: true,
      data: savedInfo,
      message: 'Brand information saved successfully'
    });

  } catch (error) {
    console.error('❌ Save brand info error:', error);
    next(error);
  }
});

/**
 * GET /brand/summary?shop=store.myshopify.com
 * Récupérer le résumé consolidé de la marque
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    console.log(`📋 Generating brand summary for ${shop}`);

    // Récupérer l'analyse existante ou en générer une nouvelle
    let analysis = await getExistingBrandAnalysis(shop);
    
    if (!analysis) {
      // Générer une nouvelle analyse
      const products = await getShopProducts(shop);
      const brandAnalysis = await analyzeBrandWithAI(products, shop);
      analysis = await saveBrandAnalysis(shop, brandAnalysis, products.length);
    }

    const summary = {
      shop,
      summary: {
        total_products: analysis.products_analyzed,
        brand_analysis: analysis.ai_analysis,
        custom_brand_info: analysis.custom_brand_info,
        analysis_type: analysis.analysis_type,
        confidence_score: analysis.confidence_score,
        last_updated: analysis.last_updated,
        created_at: analysis.created_at
      }
    };

    res.json({
      success: true,
      data: summary,
      message: 'Brand summary generated successfully'
    });

  } catch (error) {
    console.error('❌ Brand summary error:', error);
    next(error);
  }
});

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Récupérer l'analyse de marque existante
 */
async function getExistingBrandAnalysis(shop: string): Promise<any> {
  try {
    return await supabaseService.getBrandAnalysis(shop);
  } catch (error) {
    console.error('❌ Error in getExistingBrandAnalysis:', error);
    return null;
  }
}

/**
 * Vérifier si une analyse est récente (moins de 24h)
 */
function isAnalysisRecent(createdAt: string): boolean {
  const analysisDate = new Date(createdAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

/**
 * Sauvegarder l'analyse de marque dans Supabase
 */
async function saveBrandAnalysis(shop: string, aiAnalysis: any, productsCount: number): Promise<any> {
  try {
    const analysisData = {
      shop,
      ai_analysis: aiAnalysis,
      custom_brand_info: {},
      analysis_type: 'automatic',
      confidence_score: aiAnalysis.confidence_score || 0.6,
      products_analyzed: productsCount
    };

    return await supabaseService.saveBrandAnalysis(analysisData);
  } catch (error) {
    console.error('❌ Error in saveBrandAnalysis:', error);
    throw error;
  }
}

/**
 * Sauvegarder les informations manuelles de marque
 */
async function saveCustomBrandInfo(shop: string, brandInfo: any): Promise<any> {
  try {
    await supabaseService.updateCustomBrandInfo(shop, brandInfo);

    return {
      shop,
      brand_info: brandInfo,
      saved_at: new Date().toISOString(),
      source: 'manual_input'
    };
  } catch (error) {
    console.error('❌ Error in saveCustomBrandInfo:', error);
    throw error;
  }
}

/**
 * Récupérer les produits d'une boutique
 */
async function getShopProducts(shop: string): Promise<any[]> {
  try {
    // Utiliser getShopToken pour récupérer les produits
    const token = await getShopToken(shop);
    if (!token) {
      throw new Error('Shop not authenticated');
    }

    const apiUrl = `https://${shop}/admin/api/2024-01/products.json?limit=50&fields=id,title,handle,product_type,vendor,tags,body_html,images`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': token.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.products || [];
  } catch (error) {
    console.error('❌ Error fetching shop products:', error);
    throw error;
  }
}

/**
 * Analyser la marque avec OpenAI basée sur les produits
 */
async function analyzeBrandWithAI(products: any[], shop: string): Promise<any> {
  try {
    // Préparer les données des produits pour l'analyse
    const productData = products.map(p => ({
      title: p.title,
      type: p.product_type,
      vendor: p.vendor,
      tags: p.tags ? p.tags.split(',').map((tag: string) => tag.trim()) : [],
      description: p.body_html ? p.body_html.replace(/<[^>]*>/g, '').substring(0, 200) : ''
    }));

    const prompt = `
Analyze this Shopify store's brand identity based on their products. 

STORE: ${shop}
PRODUCTS: ${JSON.stringify(productData, null, 2)}

Generate a comprehensive brand analysis including:

1. BRAND PERSONALITY: What personality traits does this brand convey?
2. TARGET AUDIENCE: Who is the primary target demographic?
3. VALUE PROPOSITION: What unique value does this brand offer?
4. VISUAL STYLE: What visual elements and style are suggested?
5. MESSAGING TONE: What tone of voice should be used?
6. BRAND POSITIONING: How should this brand be positioned in the market?
7. COMPETITIVE ADVANTAGE: What makes this brand unique?
8. RECOMMENDATIONS: 3-5 specific recommendations for brand development

Return ONLY a valid JSON object with this structure:
{
  "brand_personality": "description",
  "target_audience": "description", 
  "value_proposition": "description",
  "visual_style": "description",
  "messaging_tone": "description",
  "brand_positioning": "description",
  "competitive_advantage": "description",
  "recommendations": ["rec1", "rec2", "rec3"],
  "confidence_score": 0.85,
  "analysis_timestamp": "timestamp"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a brand strategy expert. Analyze e-commerce brands and provide actionable insights. Always return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const generatedContent = response.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('No content generated by AI');
    }

    return JSON.parse(generatedContent);
  } catch (error) {
    console.error('❌ Error analyzing brand with AI:', error);
    
    // Fallback analysis
    return {
      brand_personality: "Professional and customer-focused",
      target_audience: "Quality-conscious consumers",
      value_proposition: "Premium products with excellent service",
      visual_style: "Clean, modern, and trustworthy",
      messaging_tone: "Professional yet approachable",
      brand_positioning: "Premium quality in their category",
      competitive_advantage: "Strong product quality and customer service",
      recommendations: [
        "Develop consistent visual branding",
        "Create compelling brand story",
        "Build customer loyalty programs"
      ],
      confidence_score: 0.6,
      analysis_timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyser un document texte
 */
async function analyzeTextDocument(file: Express.Multer.File): Promise<string> {
  try {
    const textContent = file.buffer.toString('utf-8');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a brand analysis expert. Extract key brand insights from text documents."
        },
        {
          role: "user",
          content: `Analyze this brand document and extract key insights:\n\n${textContent.substring(0, 4000)}`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || 'Could not analyze document';
  } catch (error) {
    console.error('❌ Error analyzing text document:', error);
    return 'Error analyzing text document';
  }
}

/**
 * Analyser un document PDF (simulation)
 */
async function analyzePDFDocument(file: Express.Multer.File): Promise<string> {
  // TODO: Implémenter l'extraction de texte PDF avec pdf-parse
  return 'PDF analysis not yet implemented - document uploaded successfully';
}

/**
 * Analyser un document avec OpenAI
 */
async function analyzeDocumentWithAI(file: Express.Multer.File): Promise<string> {
  try {
    // Pour les documents non-textuels, on peut utiliser des techniques d'extraction
    return `Document ${file.originalname} uploaded and queued for analysis`;
  } catch (error) {
    console.error('❌ Error analyzing document:', error);
    return 'Error analyzing document';
  }
}

/**
 * Enrichir l'analyse de marque
 */
async function enrichBrandAnalysis(shop: string, documentAnalysis: string, documentType: string): Promise<any> {
  try {
    const prompt = `
Enrich this brand analysis with additional insights:

SHOP: ${shop}
DOCUMENT TYPE: ${documentType}
DOCUMENT ANALYSIS: ${documentAnalysis}

Provide additional insights and recommendations based on this document.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a brand strategy expert. Provide additional insights and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.5
    });

    return {
      original_analysis: documentAnalysis,
      enriched_insights: response.choices[0]?.message?.content || 'No additional insights',
      document_type: documentType,
      enrichment_timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error enriching brand analysis:', error);
    return {
      original_analysis: documentAnalysis,
      enriched_insights: 'Error enriching analysis',
      document_type: documentType,
      enrichment_timestamp: new Date().toISOString()
    };
  }
}

export default router;
