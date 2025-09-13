import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader, Save, X, Edit } from 'lucide-react';
import { Product, Creative } from '@/types';
import { apiService } from '@/services/api';

interface VariantReviewProps {
  product: Product | null;
  creative: Creative | null;
}

export function VariantReview({ product, creative }: VariantReviewProps) {
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fieldToggles, setFieldToggles] = useState<Record<string, boolean>>({
    title: true, // Start with AI content by default
    description: true,
    ctaButton: true,
    promotionalBadge: true,
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

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

  // Automatic generation when product and creative are available
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

  // Handle editing
  const startEditing = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName);
    setEditedContent(prev => ({
      ...prev,
      [fieldName]: currentValue
    }));
  };

  const saveEdit = (fieldName: string) => {
    // Update the generated content with edited value
    if (editedContent[fieldName] && generatedContent) {
      const updatedContent = { ...generatedContent };
      
      // Map field names to generated content properties
      switch (fieldName) {
        case 'title':
          updatedContent.title = editedContent[fieldName];
          break;
        case 'description':
          updatedContent.description_html = editedContent[fieldName];
          break;
        case 'ctaButton':
          updatedContent.cta_primary = editedContent[fieldName];
          break;
        case 'promotionalBadge':
          if (!updatedContent.badges) updatedContent.badges = [];
          updatedContent.badges[0] = editedContent[fieldName];
          break;
      }
      
      setGeneratedContent(updatedContent);
    }
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
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

  // Render field with toggle and inline editing
  const renderFieldComparison = (fieldName: string, label: string, originalValue: string, generatedValue?: string) => {
    const showAI = fieldToggles[fieldName];
    const displayValue = showAI && generatedValue ? generatedValue : originalValue;
    const isEditing = editingField === fieldName;
    const currentEditValue = editedContent[fieldName] || displayValue;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <div className="flex items-center gap-2">
            {generatedValue && (
              <>
                <span className="text-xs text-gray-500">{showAI ? 'AI Generated' : 'Original Shopify'}</span>
                <Switch
                  checked={showAI}
                  onCheckedChange={() => toggleField(fieldName)}
                  size="sm"
                />
              </>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            {fieldName === 'description' ? (
              <Textarea
                value={currentEditValue}
                onChange={(e) => setEditedContent(prev => ({ ...prev, [fieldName]: e.target.value }))}
                className="min-h-[100px]"
                placeholder={`Enter ${label.toLowerCase()}...`}
              />
            ) : (
              <Input
                value={currentEditValue}
                onChange={(e) => setEditedContent(prev => ({ ...prev, [fieldName]: e.target.value }))}
                placeholder={`Enter ${label.toLowerCase()}...`}
              />
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => saveEdit(fieldName)} className="bg-green-600 hover:bg-green-700">
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 min-h-[60px] flex items-center">
              {displayValue || (showAI ? 'AI content will appear here...' : 'Original content not available')}
            </div>
            {/* Edit button - only show for AI content */}
            {showAI && generatedValue && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEditing(fieldName, displayValue)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        )}
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Generated Variant</span>
                {isGenerating ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Loader className="h-3 w-3 animate-spin" />
                    Generating...
                  </Badge>
                ) : generatedContent ? (
                  <Badge variant="secondary">AI Generated</Badge>
                ) : (
                  <Badge variant="outline">Not Generated</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!generatedContent && !isGenerating ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Preparing to Generate</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      AI content generation will start automatically when your creative is ready
                    </p>
                  </div>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="text-center p-8 bg-blue-50 rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="h-8 w-8 animate-spin text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Generating AI Content...</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Analyzing your creative and generating optimized variants
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {renderFieldComparison('title', 'Title', originalContent.title, aiContent?.title)}
                {renderFieldComparison('description', 'Description', originalContent.description, aiContent?.description)}
                {renderFieldComparison('ctaButton', 'Call-to-Action', originalContent.ctaButton, aiContent?.ctaButton)}
                {aiContent?.promotionalBadge && renderFieldComparison('promotionalBadge', 'Promotional Badge', '', aiContent.promotionalBadge)}
              </>
            )}
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

    </div>
  );
}
