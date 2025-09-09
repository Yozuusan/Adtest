import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader, Edit, Code } from 'lucide-react';
import { Product, Creative, NewVariantFormData } from '@/types';
import { apiService } from '@/services/api';

interface VariantReviewProps {
  product: Product | null;
  creative: Creative | null;
  formData: Partial<NewVariantFormData>;
  onFormDataChange: (data: Partial<NewVariantFormData>) => void;
}

export function VariantReview({ product, creative, onFormDataChange }: VariantReviewProps) {
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeVariant, setActiveVariant] = useState<'scanned' | 'generated'>('scanned');
  const [fieldToggles, setFieldToggles] = useState<Record<string, boolean>>({
    title: false,
    description: false,
    ctaButton: false,
    promotionalBadge: false,
  });

  if (!product || !creative) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">
          Please select a product and upload a creative to review the variant content.
        </p>
      </div>
    );
  }

  // Generate AI content using backend API
  const generateAIContent = async () => {
    if (!product || !creative || !creative.file) return;
    
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('creative_file', creative.file);
      formData.append('product_data', JSON.stringify({
        title: product.title,
        description: product.body_html || product.description || '',
        product_type: product.product_type || '',
        vendor: product.vendor || ''
      }));
      formData.append('variant_handle', `variant-${Date.now()}`);
      formData.append('campaign_context', JSON.stringify({
        reference: `campaign-${Date.now()}`
      }));
      formData.append('tone_of_voice', 'professional');

      const response = await apiService.generateVariant(formData);
      console.log('🤖 Generated AI content:', response);
      
      if (response.success && response.data) {
        setGeneratedContent(response.data);
      }
    } catch (error) {
      console.error('❌ Error generating AI content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate content when component mounts or when product/creative changes
  useEffect(() => {
    if (product && creative && creative.file && !generatedContent && !isGenerating) {
      generateAIContent();
    }
  }, [product, creative, generatedContent, isGenerating]);

  // Toggle individual fields
  const toggleField = (fieldName: string) => {
    setFieldToggles(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Get original content from product
  const getOriginalContent = () => ({
    title: product?.title || '',
    description: product?.description || product?.body_html?.replace(/<[^>]*>/g, '') || '',
    ctaButton: 'Add to cart',
    price: '€19,90' // This would come from product data in real implementation
  });

  // Get generated content
  const getGeneratedContent = () => {
    if (!generatedContent) return null;
    
    return {
      title: generatedContent.title || '',
      description: generatedContent.description_html?.replace(/<[^>]*>/g, '') || '',
      ctaButton: generatedContent.cta_primary || 'Découvrir maintenant',
      promotionalBadge: generatedContent.badges?.[0] || 'OFFRE SPÉCIALE'
    };
  };

  const originalContent = getOriginalContent();
  const aiContent = getGeneratedContent();

  // Render field with toggle
  const renderFieldComparison = (fieldName: string, label: string, originalValue: string, generatedValue?: string) => {
    const isActive = fieldToggles[fieldName];
    const displayValue = isActive && generatedValue ? generatedValue : originalValue;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {generatedValue && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{isActive ? 'AI' : 'Original'}</span>
              <Switch
                checked={isActive}
                onCheckedChange={() => toggleField(fieldName)}
                size="sm"
              />
            </div>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
          {displayValue || 'Not available'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Review & Edit Variant Content</h3>
        <p className="text-sm text-gray-600 mt-1">
          Review the AI-generated content and make adjustments as needed
        </p>
      </div>

      {/* Side-by-side Content Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Original Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Original Content</span>
              <Badge variant="outline">Shopify Page</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 mt-1">
                {originalContent.title || 'Not available'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 mt-1">
                {originalContent.description || 'Not available'}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Call-to-Action</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 mt-1">
                {originalContent.ctaButton}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Price</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 mt-1">
                {originalContent.price}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Generated Variant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Generated Variant</span>
              {isGenerating ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" />
                  Generating...
                </Badge>
              ) : (
                <Badge variant="secondary">AI Generated</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderFieldComparison('title', 'Title', originalContent.title, aiContent?.title)}
            {renderFieldComparison('description', 'Description', originalContent.description, aiContent?.description)}
            {renderFieldComparison('ctaButton', 'Call-to-Action', originalContent.ctaButton, aiContent?.ctaButton)}
            {aiContent?.promotionalBadge && renderFieldComparison('promotionalBadge', 'Promotional Badge', '', aiContent.promotionalBadge)}
          </CardContent>
        </Card>
      </div>

      {/* Creative Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Creative Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Extracted Text</label>
              <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded-lg">
                {creative.extracted_text || 'No text extracted'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">File Information</label>
              <div className="text-sm text-gray-600 mt-1 space-y-1">
                <p>Name: {creative.file.name}</p>
                <p>Type: {creative.file_type}</p>
                <p>Size: {(creative.file_size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Tips */}
      <details className="bg-gray-50 border border-gray-200 rounded-lg">
        <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
          💡 Best Practices & Tips
        </summary>
        <div className="px-4 pb-3">
          <ul className="text-xs text-gray-600 space-y-1 mt-2">
            <li>• Use high-quality images for better text extraction</li>
            <li>• Include clear, readable text in your creative</li>
            <li>• Supported formats: JPG, PNG, WebP, PDF</li>
            <li>• Our AI will automatically extract text and key elements</li>
          </ul>
        </div>
      </details>

      <details className="bg-gray-50 border border-gray-200 rounded-lg">
        <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
          🎯 How It Works
        </summary>
        <div className="px-4 pb-3">
          <ul className="text-xs text-gray-600 space-y-1 mt-2">
            <li>• Your creative is automatically analyzed for text and visual elements</li>
            <li>• AI extracts key messages, offers, and tone from your creative</li>
            <li>• Additional context helps refine the optimization further</li>
            <li>• You can create variants with just Product + Creative - no extra context needed!</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
