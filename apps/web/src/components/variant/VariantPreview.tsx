import { Monitor, Smartphone, Eye, Loader2, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product, Creative, NewVariantFormData } from '@/types';

interface VariantPreviewProps {
  product: Product | null;
  creative: Creative | null;
  formData: Partial<NewVariantFormData>;
  isGenerating: boolean;
  generatedVariant?: {
    handle: string;
    shopifyUrl: string;
    backendUrl: string;
  } | null;
}

export function VariantPreview({ product, creative, formData, isGenerating, generatedVariant }: VariantPreviewProps) {
  const hasAllSteps = product && creative;

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="mr-2 h-5 w-5" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAllSteps ? (
          <div className="text-center py-8">
            <div className="bg-gray-100 rounded-lg p-6 mb-4">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Preview Coming Soon</p>
              <p className="text-sm text-gray-500 mt-1">
                Complete the steps to see your variant preview
              </p>
            </div>
            
            {/* Progress Checklist */}
            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${product ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-sm ${product ? 'text-green-700' : 'text-gray-500'}`}>
                  Product selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${creative ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-sm ${creative ? 'text-green-700' : 'text-gray-500'}`}>
                  Creative uploaded
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${formData.campaign_context ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-sm ${formData.campaign_context ? 'text-green-700' : 'text-gray-500'}`}>
                  Context provided
                </span>
              </div>
            </div>
          </div>
        ) : isGenerating ? (
          /* Generating State */
          <div className="text-center py-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-3 animate-spin" />
              <p className="text-blue-900 font-medium">Generating Your Variant</p>
              <p className="text-sm text-blue-700 mt-1">
                AI is creating your optimized landing page...
              </p>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Analyzing creative</span>
                <Badge variant="success">✓</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Processing context</span>
                <Badge variant="success">✓</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Generating variant</span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            </div>
          </div>
        ) : generatedVariant ? (
          /* Variant Generated Successfully */
          <div className="text-center py-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <p className="text-green-900 font-medium mb-2">Variant Generated Successfully!</p>
              <p className="text-sm text-green-700">
                Your variant "{generatedVariant.handle}" is ready to view
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open(generatedVariant.shopifyUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Live Variant
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(generatedVariant.backendUrl, '_blank')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                Preview Backend
              </Button>
              
              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-gray-600"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedVariant.shopifyUrl);
                  }}
                >
                  <Copy className="mr-2 h-3 w-3" />
                  Copy Shopify URL
                </Button>
              </div>
            </div>
            
            {/* Variant Info */}
            <div className="bg-gray-50 rounded-lg p-3 mt-4 text-xs text-left">
              <div className="font-medium text-gray-900 mb-2">Variant Details:</div>
              <div className="space-y-1 text-gray-600">
                <div>Handle: {generatedVariant.handle}</div>
                <div>Product: {product?.title}</div>
                <div>Status: Active</div>
              </div>
            </div>
          </div>
        ) : (
          /* Default Preview State */
          <div className="space-y-4">
            {/* Device Tabs */}
            <div className="flex border-b border-gray-200">
              <button className="flex items-center px-3 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
                <Monitor className="mr-1 h-4 w-4" />
                Desktop
              </button>
              <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                <Smartphone className="mr-1 h-4 w-4" />
                Mobile
              </button>
            </div>

            {/* Preview Frame */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="h-64 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="h-2 bg-gray-200 rounded w-1/3"></div>
                  
                  {/* Hero Section */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-500 rounded"></div>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="mt-3">
                      <div className="h-6 bg-green-500 rounded w-1/3"></div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 bg-white rounded border"></div>
                    <div className="h-16 bg-white rounded border"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs">
              <div className="font-medium text-gray-900 mb-2">Applied Configuration:</div>
              <div className="space-y-1 text-gray-600">
                <div>Product: {product?.title}</div>
                {formData.tone_of_voice && (
                  <div>Tone: {formData.tone_of_voice}</div>
                )}
                {formData.target_audience && (
                  <div>Audience: {formData.target_audience}</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button className="w-full" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Full Preview
              </Button>
              <Button className="w-full" variant="outline">
                Edit Variant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}