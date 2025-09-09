// apps/backend/src/routes/ai-variants.ts
// NOUVEAU ENDPOINT pour générer des variantes via IA

import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import OpenAI from 'openai';
import multer from 'multer';

const router = Router();

// Configuration multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter images et PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez JPG, PNG, WebP ou PDF.'));
    }
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /ai-variants/generate
 * Génère une variante via IA basée sur une créative + produit
 * 
 * Body: FormData avec:
 * - creative_file: File (image ou PDF)
 * - product_data: JSON string avec les infos produit
 * - campaign_context: JSON string avec contexte campagne (optionnel)
 * - tone_of_voice: string (optionnel)
 */
router.post('/generate', upload.single('creative_file'), async (req, res, next) => {
  try {
    console.log('🤖 Starting AI variant generation...');
    
    const { product_data, campaign_context, tone_of_voice, variant_handle } = req.body;
    const creativeFile = req.file;

    // Validation
    if (!product_data) {
      throw createError('product_data is required', 400);
    }

    if (!creativeFile) {
      throw createError('creative_file is required', 400);
    }

    if (!variant_handle) {
      throw createError('variant_handle is required', 400);
    }

    // Parser les données JSON
    let productInfo;
    let campaignInfo = {};
    
    try {
      productInfo = JSON.parse(product_data);
      if (campaign_context) {
        campaignInfo = JSON.parse(campaign_context);
      }
    } catch (e) {
      throw createError('Invalid JSON in product_data or campaign_context', 400);
    }

    console.log(`📝 Generating variant for product: ${productInfo.title}`);
    console.log(`🎨 Creative file: ${creativeFile.originalname} (${creativeFile.mimetype})`);

    // Analyser la créative avec OpenAI Vision (si image)
    let creativeAnalysis = '';
    
    if (creativeFile.mimetype.startsWith('image/')) {
      creativeAnalysis = await analyzeCreativeImage(creativeFile);
    } else if (creativeFile.mimetype === 'application/pdf') {
      // Pour PDF, on pourrait extraire le texte ou convertir en image
      creativeAnalysis = 'PDF creative uploaded (text extraction not implemented yet)';
    }

    // Générer la variante avec OpenAI
    const generatedVariant = await generateVariantWithAI({
      productInfo,
      creativeAnalysis,
      campaignInfo,
      toneOfVoice: tone_of_voice || 'professional'
    });

    // Ajouter les métadonnées
    const variantData = {
      ...generatedVariant,
      variant_handle,
      campaign_ref: (campaignInfo as any).reference || `campaign_${Date.now()}`,
      generated_at: new Date().toISOString(),
      source: 'ai_generated',
      creative_file_name: creativeFile.originalname,
      creative_file_type: creativeFile.mimetype
    };

    res.json({
      success: true,
      data: variantData,
      message: 'Variant generated successfully with AI'
    });

  } catch (error) {
    console.error('❌ AI variant generation error:', error);
    next(error);
  }
});

/**
 * Analyser une image créative avec OpenAI Vision
 */
async function analyzeCreativeImage(file: Express.Multer.File): Promise<string> {
  try {
    // Convertir le buffer en base64
    const base64Image = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this advertising creative and extract key marketing elements: main message, visual style, target audience, call-to-action, emotional tone, and key selling points. Be concise and focus on elements that should influence a product page variant."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "low" // Pour économiser les tokens
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || 'Could not analyze creative';
  } catch (error) {
    console.error('❌ Error analyzing creative:', error);
    return 'Error analyzing creative image';
  }
}

/**
 * Générer une variante avec OpenAI basée sur les inputs
 */
async function generateVariantWithAI(params: {
  productInfo: any;
  creativeAnalysis: string;
  campaignInfo: any;
  toneOfVoice: string;
}): Promise<any> {
  const { productInfo, creativeAnalysis, campaignInfo, toneOfVoice } = params;

  const prompt = `
You are an expert e-commerce copywriter and conversion optimizer. 

PRODUCT INFORMATION:
- Title: ${productInfo.title}
- Description: ${productInfo.description || 'No description available'}
- Product Type: ${productInfo.product_type || 'Unknown'}
- Vendor: ${productInfo.vendor || 'Unknown'}

CREATIVE ANALYSIS:
${creativeAnalysis}

CAMPAIGN CONTEXT:
${JSON.stringify(campaignInfo, null, 2)}

TONE OF VOICE: ${toneOfVoice}

Generate an optimized product page variant that aligns with the creative analysis. Return ONLY a valid JSON object with this exact structure:

{
  "title": "Compelling product title aligned with creative (max 80 chars)",
  "subtitle": "Supporting subtitle that reinforces the main message (max 120 chars)",
  "description_html": "<p>Rich HTML description that expands on the creative message and highlights key benefits. Include 2-3 paragraphs with strong selling points.</p>",
  "hero_image": "URL of hero image if mentioned in creative, or null",
  "usp_list": [
    "First unique selling point",
    "Second compelling benefit", 
    "Third key advantage"
  ],
  "cta_primary": "Action-oriented primary CTA button text (max 25 chars)",
  "cta_secondary": "Secondary CTA if needed (max 25 chars)",
  "badges": [
    "Trust badge 1",
    "Social proof badge 2"
  ]
}

Focus on:
- Conversion optimization
- Alignment with creative messaging
- Emotional triggers from the analysis
- Clear value proposition
- Urgency or scarcity if present in creative
- Trust signals and social proof
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a conversion optimization expert. Generate compelling product page variants that maximize conversions. Always return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const generatedContent = response.choices[0]?.message?.content;
    if (!generatedContent) {
      throw new Error('No content generated by AI');
    }

    return JSON.parse(generatedContent);
  } catch (error) {
    console.error('❌ Error generating variant with AI:', error);
    
    // Fallback variant en cas d'erreur IA
    return {
      title: `${productInfo.title} - Special Offer`,
      subtitle: "Limited time offer - Don't miss out!",
      description_html: `<p><strong>Transform your experience with ${productInfo.title}.</strong></p><p>This premium product offers exceptional value and quality you can trust.</p><p>Order now and discover why customers love this product!</p>`,
      hero_image: null,
      usp_list: [
        "Premium quality guaranteed",
        "Fast shipping included",
        "Customer satisfaction promise"
      ],
      cta_primary: "Shop Now",
      cta_secondary: "Learn More",
      badges: [
        "Best Seller",
        "Trusted Brand"
      ]
    };
  }
}

/**
 * NOUVEAU: Endpoint pour analyser seulement la creative (étape 1)
 * POST /ai-variants/analyze-creative
 */
router.post('/analyze-creative', upload.single('creative_file'), async (req, res, next) => {
  try {
    const { shop } = req.body;
    const file = req.file;

    if (!file) {
      throw createError('Creative file is required', 400);
    }

    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    console.log(`🎨 Analyzing creative for shop: ${shop}`);
    console.log(`📁 File: ${file.originalname} (${file.size} bytes)`);

    // Analyser la créative avec OpenAI Vision
    const extractedText = await analyzeCreativeImage(file);

    console.log(`✅ Creative analysis completed: ${extractedText.substring(0, 100)}...`);

    res.json({
      success: true,
      extracted_text: extractedText,
      file_info: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ Creative analysis error:', error);
    next(error);
  }
});

export default router;
