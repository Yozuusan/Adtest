import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Copy, Edit, Eye } from 'lucide-react';

interface VariantData {
  handle: string;
  product: any;
  creative: any;
  formData: any;
  shopifyUrl: string;
  backendUrl: string;
}

export function VariantPreview() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [variantData, setVariantData] = useState<VariantData | null>(null);
  const [activeTab, setActiveTab] = useState<'original' | 'generated'>('generated');

  useEffect(() => {
    // Load variant data from localStorage
    const stored = localStorage.getItem('currentVariant');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setVariantData(data);
      } catch (error) {
        console.error('Failed to parse variant data:', error);
        navigate('/variants');
      }
    } else {
      navigate('/variants');
    }
  }, [handle, navigate]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    // You could add a toast notification here
  };

  const handleTestVariant = () => {
    if (variantData?.shopifyUrl) {
      window.open(variantData.shopifyUrl, '_blank');
    }
  };

  const handleSaveAndFinish = async () => {
    // Here you would save the variant to the backend
    console.log('Saving variant:', variantData);
    
    // For now, just navigate to variants list
    navigate('/variants');
  };

  if (!variantData) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Loading variant...</h2>
            <p className="text-gray-600">Preparing your variant preview</p>
          </div>
        </div>
      </div>
    );
  }

  // Generate mock optimized content based on the creative
  const extractedText = variantData.creative?.extracted_text || '';
  const originalProduct = variantData.product;
  
  const optimizedContent = {
    title: extractedText.includes('ANTI DÉMANGEAISON') 
      ? '🌿 Savon Anti-Démangeaison - Offre Spéciale'
      : `🔥 ${originalProduct.title} - Offre Limitée`,
    description: extractedText.includes('ANTI DÉMANGEAISON')
      ? 'Découvrez notre savon anti-démangeaison naturel - Produit optimisé pour une expérience client exceptionnelle avec des bénéfices uniques.'
      : 'Produit optimisé pour une expérience client exceptionnelle avec des bénéfices uniques.',
    cta: extractedText.includes('ANTI DÉMANGEAISON') 
      ? '🛒 Soulager mes démangeaisons'
      : '🛒 Découvrir maintenant',
    badge: extractedText.includes('ANTI DÉMANGEAISON')
      ? '✨ NOUVEAU - Action Apaisante'
      : '✨ OFFRE SPÉCIALE'
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/variants')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Variants
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Variant Preview</h1>
        <p className="text-gray-600 mt-2">
          Review your generated variant before going live
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Variant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Variant Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Variant Handle</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{variantData.handle}</code>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleCopyUrl(variantData.handle)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Product</label>
                  <p className="text-sm text-gray-900 mt-1">{originalProduct.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Creative Analysis</label>
                  <p className="text-sm text-gray-600 mt-1">{extractedText}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Content Mapping & Preview</CardTitle>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant={activeTab === 'original' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('original')}
                >
                  Original Content
                </Button>
                <Button 
                  variant={activeTab === 'generated' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('generated')}
                >
                  <Badge className="mr-2">AI Generated</Badge>
                  Generated Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 'original' && (
                  <>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">📄 Original Content</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                          <p className="text-sm text-gray-900">{originalProduct.title}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                          <p className="text-sm text-gray-600">
                            Le Savon à Barres de Noix de Coco est parfait pour le nettoyage quotidien. 
                            Il est fait main en petites quantités utilisant des méthodes traditionnelles.
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">CTA Button</label>
                          <p className="text-sm text-gray-900">Add to cart</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Price</label>
                          <p className="text-sm text-gray-900">€19,90</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'generated' && (
                  <>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">✨ Generated Variant</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                          <p className="text-sm text-gray-900 font-medium">{optimizedContent.title}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                          <p className="text-sm text-gray-600">{optimizedContent.description}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">CTA Button</label>
                          <p className="text-sm text-gray-900 font-medium">{optimizedContent.cta}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Promotional Badge</label>
                          <Badge variant="secondary" className="text-xs">
                            {optimizedContent.badge}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">🎯 Optimization Notes</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>• Enhanced title with urgency and emojis</p>
                        <p>• Optimized description for conversion</p>
                        <p>• Action-oriented CTA button</p>
                        <p>• Promotional badge for visibility</p>
                        <p>• Based on creative content analysis</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* URLs & Links */}
          <Card>
            <CardHeader>
              <CardTitle>Variant URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Shopify Live URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="text" 
                      value={variantData.shopifyUrl}
                      readOnly
                      className="flex-1 text-sm border rounded px-2 py-1 bg-gray-50"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCopyUrl(variantData.shopifyUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleTestVariant}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Backend Demo URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="text" 
                      value={variantData.backendUrl}
                      readOnly
                      className="flex-1 text-sm border rounded px-2 py-1 bg-gray-50"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCopyUrl(variantData.backendUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleTestVariant}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Test Live Variant
              </Button>
              <Button 
                onClick={() => navigate(`/variants/edit/${handle}`)}
                className="w-full"
                variant="outline"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Mapping
              </Button>
              <Button 
                onClick={handleSaveAndFinish}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Save & Finish
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Preview Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Product selected</span>
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Creative analyzed</span>
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Content optimized</span>
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ready to deploy</span>
                  <Badge className="bg-green-600">✓</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}