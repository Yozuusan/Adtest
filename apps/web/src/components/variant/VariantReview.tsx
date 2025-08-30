import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Save, X } from 'lucide-react';
import { Product, Creative, NewVariantFormData } from '@/types';

interface VariantReviewProps {
  product: Product | null;
  creative: Creative | null;
  formData: Partial<NewVariantFormData>;
  onFormDataChange: (data: Partial<NewVariantFormData>) => void;
}

export function VariantReview({ product, creative, onFormDataChange }: VariantReviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!product || !creative) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">
          Please select a product and upload a creative to review the variant content.
        </p>
      </div>
    );
  }

  // Generate initial content based on creative analysis
  const generateContent = () => {
    const extractedText = creative.extracted_text || '';
    const productTitle = product.title;
    
    // Smart content generation based on creative analysis
    let title = productTitle;
    let description = '';
    let cta = 'Add to Cart';
    let badge = '';

    if (extractedText.toLowerCase().includes('anti-démangeaison') || 
        extractedText.toLowerCase().includes('savon')) {
      title = `🌿 ${productTitle} - Action Apaisante Naturelle`;
      description = 'Savon naturel spécialement formulé pour apaiser les démangeaisons et irritations cutanées. Ingrédients 100% naturels, convient aux peaux sensibles.';
      cta = '🛒 Soulager mes démangeaisons';
      badge = '🌿 NOUVEAU - Action Apaisante';
    } else if (extractedText.toLowerCase().includes('offre') || 
               extractedText.toLowerCase().includes('promo')) {
      title = `🔥 ${productTitle} - Offre Spéciale`;
      description = 'Produit optimisé pour une expérience client exceptionnelle avec des bénéfices uniques.';
      cta = '🛒 Découvrir maintenant';
      badge = '✨ OFFRE SPÉCIALE';
    }

    return { title, description, cta, badge };
  };

  const content = generateContent();

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
            <Badge variant="secondary">AI Generated</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderEditableField('title', 'Variant Title', content.title)}
          {renderEditableField('description', 'Variant Description', content.description, 'textarea')}
          {renderEditableField('cta', 'Call-to-Action', content.cta)}
          {renderEditableField('badge', 'Promotional Badge', content.badge)}
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

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Content Optimization Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Keep titles under 60 characters for better SEO</li>
          <li>• Use action words in CTAs (e.g., "Shop Now", "Learn More")</li>
          <li>• Include relevant keywords from your creative</li>
          <li>• Test different messaging approaches for better conversion</li>
        </ul>
      </div>
    </div>
  );
}
