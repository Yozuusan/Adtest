import { useEffect, useState } from 'react';
import { Upload, Palette, MessageCircle, Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface BrandAnalysis {
  brand_personality: string;
  target_audience: string;
  value_proposition: string;
  visual_style: string;
  messaging_tone: string;
  brand_positioning: string;
  competitive_advantage: string;
  recommendations: string[];
  confidence_score?: number;
}

export function Brand() {
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customBrandInfo, setCustomBrandInfo] = useState('');
  const { currentShop } = useAuth();
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (currentShop?.shop?.domain) {
      fetch(`${apiUrl}/brand/analysis?shop=${currentShop.shop.domain}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setAnalysis(data.data?.ai_analysis || null))
        .catch(() => setAnalysis(null));
    }
  }, [currentShop?.shop?.domain, apiUrl]);

  const handleAnalyzeBrand = async () => {
    if (!currentShop?.shop?.domain) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${apiUrl}/brand/analyze?shop=${currentShop.shop.domain}`);
      if (res.ok) {
        const json = await res.json();
        setAnalysis(json.data?.ai_analysis || null);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUploadDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Uploading document:', file.name);
      // Handle document upload
    }
  };

  if (!currentShop?.shop?.domain) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-600 font-medium mb-2">No store connected</p>
          <p className="text-sm text-gray-500">Connect your Shopify store to analyze your brand</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brand Intelligence</h1>
          <p className="text-gray-600 mt-1">
            AI-powered analysis of your brand, products, and communication style
          </p>
        </div>
        <div className="flex gap-2">
          {analysis ? (
            <Button variant="outline" onClick={handleAnalyzeBrand} disabled={isAnalyzing}>
              {isAnalyzing ? 'Refreshing...' : 'Refresh Analysis'}
            </Button>
          ) : (
            <Button onClick={handleAnalyzeBrand} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-700">
              {isAnalyzing ? 'Analyzing...' : 'Analyze My Brand'}
            </Button>
          )}
        </div>
      </div>

      {/* Brand Analysis Results */}
      {analysis && !isAnalyzing ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                Brand Analysis
              </CardTitle>
              {analysis.confidence_score !== undefined && (
                <Badge variant="success">
                  {Math.round(analysis.confidence_score * 100)}% Confidence
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Brand Personality</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.brand_personality}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-gray-900">Target Audience</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.target_audience}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <Palette className="mr-2 h-4 w-4 text-purple-600" />
                  <h3 className="font-medium text-gray-900">Visual Style</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.visual_style}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Messaging Tone</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.messaging_tone}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <h3 className="font-medium text-gray-900">Value Proposition</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.value_proposition}
                </p>
              </div>

              <div className="space-y-3">
              <div className="flex items-center">
                  <h3 className="font-medium text-gray-900">Brand Positioning</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.brand_positioning}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <h3 className="font-medium text-gray-900">Competitive Advantage</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {analysis.competitive_advantage}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Recommendations</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : isAnalyzing ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Analyzing your brand and products...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No brand analysis yet</p>
            <p className="text-sm text-gray-500">Click "Analyze My Brand" to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Upload brand guidelines, style guides, or any document to improve AI understanding
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              id="brand-doc-upload"
              className="hidden"
              onChange={handleUploadDocument}
            />
            <label htmlFor="brand-doc-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-900">Upload Brand Document</p>
              <p className="text-sm text-gray-500 mt-1">PDF, DOC, DOCX, TXT (Max 5MB)</p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Additional Brand Info */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Brand Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              rows={6}
              value={customBrandInfo}
              onChange={(e) => setCustomBrandInfo(e.target.value)}
              placeholder="Add brand information, values, positioning, or style guidelines that should influence variant generation...\n\nExamples:\n• Brand values and mission\n• Tone of voice preferences\n• Target audience insights\n• Unique selling propositions\n• Messaging do's and don'ts"
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                This information will be used to create more accurate and on-brand variants
              </p>
              <Button>Save Brand Info</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
