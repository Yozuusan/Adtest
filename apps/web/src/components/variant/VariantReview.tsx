import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Save, X, Loader } from 'lucide-react';
import { Product, Creative, NewVariantFormData } from '@/types';
import { apiService } from '@/services/api';

interface VariantReviewProps {
  product: Product | null;
  creative: Creative | null;
  formData: Partial<NewVariantFormData>;
  onFormDataChange: (data: Partial<NewVariantFormData>) => void;
}

export function VariantReview({ product, creative, onFormDataChange }: VariantReviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Fallback content while generating or if generation fails
  const getContent = () => {
    if (generatedContent) {
      return {
        title: generatedContent.title,
        subtitle: generatedContent.subtitle,
        description: generatedContent.description_html?.replace(/<[^>]*>/g, '') || '', // Strip HTML for textarea
        description_html: generatedContent.description_html,
        cta_primary: generatedContent.cta_primary,
        cta_secondary: generatedContent.cta_secondary,
        usp_list: generatedContent.usp_list || [],
        badges: generatedContent.badges || []
      };
    }
    
    // Fallback while loading
    return {
      title: product?.title || '',
      subtitle: '',
      description: '',
      description_html: '',
      cta_primary: 'Add to Cart',
      cta_secondary: '',
      usp_list: [],
      badges: []
    };
  };

  const content = getContent();

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = (field: string) => {
    const updates: Partial<NewVariantFormData> = {};
    
    switch (field) {
      case 'title':
        updates.campaign_context = editValue;
        break;
      case 'description':
        updates.campaign_context = editValue;
        break;
      case 'cta':
        updates.campaign_context = editValue;
        break;
      case 'badge':
        updates.campaign_context = editValue;
        break;
    }
    
    onFormDataChange(updates);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderEditableField = (field: string, label: string, value: string, type: 'text' | 'textarea' = 'text') => {
    if (editingField === field) {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {type === 'textarea' ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          )}
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => saveEdit(field)}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <p className="text-sm text-gray-900 mt-1">{value}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => startEditing(field, value)}
        >
          <Edit3 className="h-4 w-4" />
        </Button>
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

      {/* Content Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Content Mapping</span>
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
        <CardContent className="space-y-6">
          {renderEditableField('title', 'Variant Title', content.title)}
          {content.subtitle && renderEditableField('subtitle', 'Subtitle', content.subtitle)}
          {renderEditableField('description', 'Variant Description', content.description, 'textarea')}
          {renderEditableField('cta_primary', 'Primary Call-to-Action', content.cta_primary)}
          {content.cta_secondary && renderEditableField('cta_secondary', 'Secondary CTA', content.cta_secondary)}
          
          {/* USP List */}
          {content.usp_list && content.usp_list.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Key Selling Points</label>
              <div className="mt-2 space-y-2">
                {content.usp_list.map((usp, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">{usp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {content.badges && content.badges.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Promotional Badges</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {content.badges.map((badge, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
