import { useState } from 'react';
import { 
  Target, 
  Scan, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Eye,
  Settings,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';


const mockMappingData = {
  shop_url: 'https://adlign.myshopify.com',
  product_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco',
  scan_status: 'completed' as 'completed' | 'scanning',
  scan_progress: 100,
  total_elements: 12,
  mapped_elements: 9,
  elements: [
    {
      id: '1',
      selector: 'h1.product-title',
      element_type: 'title' as const,
      confidence_score: 0.95,
      current_content: 'Savon à Barres de Noix de Coco',
      position: { x: 120, y: 200 },
      suggested_mapping: true,
      is_verified: true
    },
    {
      id: '2',
      selector: '.product-subtitle',
      element_type: 'subtitle' as const,
      confidence_score: 0.88,
      current_content: 'Fait main avec des ingrédients naturels',
      position: { x: 120, y: 240 },
      suggested_mapping: true,
      is_verified: true
    },
    {
      id: '3',
      selector: '.product-description',
      element_type: 'description' as const,
      confidence_score: 0.92,
      current_content: 'Le Savon à Barres de Noix de Coco est parfait pour le nettoyage quotidien...',
      position: { x: 120, y: 320 },
      suggested_mapping: true,
      is_verified: true
    },
    {
      id: '4',
      selector: '.product-image img',
      element_type: 'image' as const,
      confidence_score: 0.98,
      current_content: 'soap-image-1.png',
      position: { x: 400, y: 150 },
      suggested_mapping: true,
      is_verified: true
    },
    {
      id: '5',
      selector: '.btn-add-to-cart',
      element_type: 'cta' as const,
      confidence_score: 0.91,
      current_content: 'Add to Cart',
      position: { x: 120, y: 500 },
      suggested_mapping: true,
      is_verified: true
    },
    {
      id: '6',
      selector: '.price-display',
      element_type: 'price' as const,
      confidence_score: 0.96,
      current_content: '$24.99',
      position: { x: 120, y: 280 },
      suggested_mapping: true,
      is_verified: true
    },
    {
      id: '7',
      selector: '.product-badge',
      element_type: 'badge' as const,
      confidence_score: 0.75,
      current_content: 'Natural',
      position: { x: 400, y: 120 },
      suggested_mapping: false,
      is_verified: false
    },
    {
      id: '8',
      selector: '.secondary-cta',
      element_type: 'cta' as const,
      confidence_score: 0.65,
      current_content: 'Learn More',
      position: { x: 280, y: 500 },
      suggested_mapping: false,
      is_verified: false
    },
    {
      id: '9',
      selector: '.product-features',
      element_type: 'description' as const,
      confidence_score: 0.70,
      current_content: 'Features list',
      position: { x: 120, y: 400 },
      suggested_mapping: false,
      is_verified: false
    }
  ]
};

export function ThemeMapping() {
  const [mappingData, setMappingData] = useState(mockMappingData);
  const [isScanning, setIsScanning] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleStartScan = async () => {
    setIsScanning(true);
    // Simulate scan process
    setMappingData(prev => ({ ...prev, scan_status: 'scanning' as 'completed' | 'scanning', scan_progress: 0 }));
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setMappingData(prev => ({ ...prev, scan_progress: i }));
    }
    
    setMappingData(prev => ({ ...prev, scan_status: 'completed' as 'completed' | 'scanning' }));
    setIsScanning(false);
  };

  const toggleElementVerification = (elementId: string) => {
    setMappingData(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId 
          ? { ...el, is_verified: !el.is_verified }
          : el
      )
    }));
  };

  const getElementTypeColor = (type: string) => {
    const colors = {
      title: 'bg-blue-100 text-blue-800',
      subtitle: 'bg-indigo-100 text-indigo-800',
      description: 'bg-gray-100 text-gray-800',
      image: 'bg-green-100 text-green-800',
      cta: 'bg-orange-100 text-orange-800',
      price: 'bg-emerald-100 text-emerald-800',
      badge: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const verifiedElements = mappingData.elements.filter(el => el.is_verified).length;
  const mappingCompleteness = (verifiedElements / mappingData.total_elements) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Theme Mapping</h1>
          <p className="text-gray-600 mt-1">
            Scan and map your Shopify theme elements for variant optimization
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewMode ? 'Exit Preview' : 'Preview Mode'}
          </Button>
          <Button 
            onClick={handleStartScan}
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isScanning ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Scan className="mr-2 h-4 w-4" />
            )}
            {isScanning ? 'Scanning...' : 'Scan Theme'}
          </Button>
        </div>
      </div>

      {/* Scan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Scan Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Product: {mappingData.product_url.split('/').pop()?.replace(/-/g, ' ')}
                </p>
                <p className="text-sm text-gray-500">{mappingData.product_url}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(mappingData.product_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {mappingData.scan_status === 'scanning' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Scanning elements...</span>
                  <span className="text-sm text-gray-600">{mappingData.scan_progress}%</span>
                </div>
                <Progress value={mappingData.scan_progress} className="h-2" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{mappingData.total_elements}</p>
                <p className="text-sm text-gray-500">Total Elements</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{verifiedElements}</p>
                <p className="text-sm text-gray-500">Verified</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{Math.round(mappingCompleteness)}%</p>
                <p className="text-sm text-gray-500">Complete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Mode Notice */}
      {previewMode && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse mr-3"></div>
              <p className="text-purple-800 font-medium">
                Preview Mode Active: Visit your product page to see mapped elements highlighted in purple
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapped Elements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mapped Elements</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Mapping
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mappingData.elements.map((element) => (
              <div
                key={element.id}
                className={`border rounded-lg p-4 transition-colors ${
                  element.is_verified 
                    ? 'border-green-200 bg-green-50' 
                    : element.suggested_mapping
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={getElementTypeColor(element.element_type)}>
                        {element.element_type}
                      </Badge>
                      <span className="font-mono text-sm text-gray-600">
                        {element.selector}
                      </span>
                      <div className="flex items-center space-x-1">
                        {element.is_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : element.suggested_mapping ? (
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-500">
                          {Math.round(element.confidence_score * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-900 mb-2">
                      <span className="font-medium">Current content:</span> {element.current_content}
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      Position: {element.position.x}px, {element.position.y}px
                    </p>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant={element.is_verified ? "default" : "outline"}
                      onClick={() => toggleElementVerification(element.id)}
                    >
                      {element.is_verified ? 'Verified' : 'Verify'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How Theme Mapping Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Automatic Scan</p>
                <p className="text-sm text-gray-600">
                  Our AI scans your product page and identifies key elements like titles, images, CTAs, and prices.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Verify Mappings</p>
                <p className="text-sm text-gray-600">
                  Review and verify the suggested element mappings. Click "Verify" to confirm each element.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Preview Mode</p>
                <p className="text-sm text-gray-600">
                  Use Preview Mode to see mapped elements highlighted on your actual product page in purple.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-medium text-blue-600">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Variants</p>
                <p className="text-sm text-gray-600">
                  Once mapping is complete, create variants that will automatically modify these mapped elements.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}