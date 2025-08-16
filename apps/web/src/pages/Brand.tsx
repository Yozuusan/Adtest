import { useState } from 'react';
import { Upload, Palette, Target, MessageCircle, Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const mockBrandAnalysis = {
  voice_analysis: 'Professional yet approachable, focusing on natural ingredients and wellness benefits',
  key_products: ['Coconut Bar Soap', 'Natural Skincare Line', 'Eco-friendly Bath Products'],
  target_audience: 'Health-conscious consumers aged 25-45 who value natural, sustainable products',
  communication_style: 'Warm, educational, and benefit-focused with emphasis on natural ingredients',
  summary: 'A premium natural skincare brand that emphasizes sustainability, wellness, and the power of natural ingredients. The brand communicates through educational content that highlights product benefits while maintaining an approachable, trustworthy tone.',
  confidence_score: 0.87
};

export function Brand() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(true);
  const [customBrandInfo, setCustomBrandInfo] = useState('');

  const handleAnalyzeBrand = async () => {
    setIsAnalyzing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsAnalyzing(false);
    setHasAnalysis(true);
  };

  const handleUploadDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Uploading document:', file.name);
      // Handle document upload
    }
  };

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
          {!hasAnalysis ? (
            <Button
              onClick={handleAnalyzeBrand}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze My Brand'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleAnalyzeBrand}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Refreshing...' : 'Refresh Analysis'}
            </Button>
          )}
        </div>
      </div>

      {/* Brand Analysis Results */}
      {hasAnalysis && !isAnalyzing ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                Brand Analysis
              </CardTitle>
              <Badge variant="success">
                {Math.round(mockBrandAnalysis.confidence_score * 100)}% Confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Brand Voice */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Brand Voice</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {mockBrandAnalysis.voice_analysis}
                </p>
              </div>

              {/* Target Audience */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-gray-900">Target Audience</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {mockBrandAnalysis.target_audience}
                </p>
              </div>

              {/* Key Products */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Target className="mr-2 h-4 w-4 text-orange-600" />
                  <h3 className="font-medium text-gray-900">Key Products</h3>
                </div>
                <div className="space-y-2">
                  {mockBrandAnalysis.key_products.map((product, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-2" />
                      {product}
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication Style */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Palette className="mr-2 h-4 w-4 text-purple-600" />
                  <h3 className="font-medium text-gray-900">Communication Style</h3>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {mockBrandAnalysis.communication_style}
                </p>
              </div>
            </div>

            {/* Brand Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Brand Summary</h3>
              <p className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg leading-relaxed">
                {mockBrandAnalysis.summary}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isAnalyzing ? (
        /* Loading State */
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Analyzing your brand and products...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </CardContent>
        </Card>
      ) : (
        /* No Analysis State */
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

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Brand Guidelines</Badge>
            <Badge variant="outline">Style Guide</Badge>
            <Badge variant="outline">Voice & Tone</Badge>
            <Badge variant="outline">Brand Strategy</Badge>
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
              placeholder="Add brand information, values, positioning, or style guidelines that should influence variant generation...

Examples:
• Brand values and mission
• Tone of voice preferences
• Target audience insights
• Unique selling propositions
• Messaging do's and don'ts"
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                This information will be used to create more accurate and on-brand variants
              </p>
              <Button>
                Save Brand Info
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Better Brand Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
              Ensure your product descriptions are detailed and reflect your brand voice
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
              Upload brand documents for more accurate analysis
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
              Regularly update your brand information as your business evolves
            </li>
            <li className="flex items-start">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
              Review and refine the analysis to ensure it matches your brand identity
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}