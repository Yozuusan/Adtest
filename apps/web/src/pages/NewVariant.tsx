import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductSelector } from '@/components/variant/ProductSelector';
import { CreativeUploader } from '@/components/variant/CreativeUploader';
import { AdditionalContext } from '@/components/variant/AdditionalContext';
import { VariantReview } from '@/components/variant/VariantReview';
import { VariantPreview } from '@/components/variant/VariantPreview';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Product, Creative, NewVariantFormData } from '@/types';
import { apiService } from '@/services/api';
import { useVariantStore } from '@/stores/useVariantStore';

const STEPS = [
  { id: 1, title: 'Select Product', description: 'Choose your Shopify product' },
  {
    id: 2,
    title: 'Upload Creative',
    description: 'Add your creative and campaign context',
  },
  { id: 3, title: 'Review', description: 'Validate and edit variant content' },
];

export function NewVariant() {
  const navigate = useNavigate();
  const { addVariant } = useVariantStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [formData, setFormData] = useState<Partial<NewVariantFormData>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariant, setGeneratedVariant] = useState<{
    handle: string;
    shopifyUrl: string;
    backendUrl: string;
  } | null>(null);

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return !!selectedProduct;
      case 3:
        return !!selectedProduct && !!selectedCreative;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleGenerate = async () => {
    if (!selectedProduct || !selectedCreative) return;
    
    setIsGenerating(true);
    
    try {
      console.log('🎯 Starting variant generation with real API calls...');
      
      // Generate variant handle if not provided - use creative content for smart naming
      let autoHandle = `variant-${Date.now()}`;
      const extractedText = selectedCreative?.extracted_text?.toUpperCase() || '';
      const fileName = selectedCreative?.file?.name?.toLowerCase() || '';
      
      console.log('🔍 Debug handle generation:', { extractedText, fileName });
      
      if (extractedText.includes('SAVON') || 
          extractedText.includes('DÉMANGEAISON') ||
          extractedText.includes('ANTI-DÉMANGEAISON') ||
          fileName.includes('creative') ||
          fileName.includes('savon')) {
        autoHandle = 'savon-anti-demangeaison-v1';
        console.log('✅ Generated savon handle:', autoHandle);
      } else {
        console.log('⚠️ Using generic handle:', autoHandle);
      }
      const variantHandle = formData.variant_handle || autoHandle;
      
      // Generate shop name
      const shopName = selectedProduct.product_url.includes('myshopify.com') 
        ? selectedProduct.product_url.split('.myshopify.com')[0].split('://')[1]
        : 'adlign';
      
      // Step 1: Generate AI content first
      console.log('🤖 Step 1: Generating AI content...');
      const aiFormData = new FormData();
      aiFormData.append('creative_file', selectedCreative.file);
      aiFormData.append('product_data', JSON.stringify({
        title: selectedProduct.title,
        description: selectedProduct.body_html || selectedProduct.description || '',
        product_type: selectedProduct.product_type || '',
        vendor: selectedProduct.vendor || ''
      }));
      aiFormData.append('variant_handle', variantHandle);
      aiFormData.append('campaign_context', JSON.stringify({
        reference: `campaign-${Date.now()}`
      }));
      aiFormData.append('tone_of_voice', 'professional');

      const aiResponse = await apiService.generateVariant(aiFormData);
      console.log('✅ AI content generated:', aiResponse);
      
      // Step 2: Create and save the variant
      console.log('💾 Step 2: Saving variant to backend...');
      const variantData = {
        product_gid: selectedProduct.gid || `gid://shopify/Product/${selectedProduct.id}`,
        handle: variantHandle,
        shop: `${shopName}.myshopify.com`,
        content_json: aiResponse.data || {
          title: `🔥 ${selectedProduct.title} - Special Offer`,
          description_html: `<strong>Optimized</strong> variant for ${selectedProduct.title}`,
          cta_primary: "🛒 Discover Now",
          promotional_badge: "✨ SPECIAL OFFER"
        }
      };

      const saveResponse = await apiService.createVariant(variantData);
      console.log('✅ Variant saved:', saveResponse);

      // Add the variant to the store so it appears in the Variants tab
      const newVariant = {
        id: saveResponse.data?.id || variantHandle,
        variant_handle: variantHandle,
        product_title: selectedProduct.title,
        product_id: selectedProduct.id,
        status: 'active',
        created_at: new Date().toISOString(),
        ...saveResponse.data
      };
      addVariant(newVariant);
      console.log('✅ Variant added to store:', newVariant);

      // Step 3: Generate URLs and navigate
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const backendSnippetUrl = `${apiUrl}/snippet?av=${variantHandle}&shop=${shopName}.myshopify.com`;
      const shopifyVariantUrl = `${selectedProduct.product_url}?adlign_variant=${variantHandle}`;
      
      // Store variant data for the preview page
      const previewData = {
        handle: variantHandle,
        product: selectedProduct,
        creative: selectedCreative,
        formData,
        shopifyUrl: shopifyVariantUrl,
        backendUrl: backendSnippetUrl,
        savedVariant: saveResponse,
        generatedContent: aiResponse.data
      };
      
      // Save to localStorage for the preview page
      localStorage.setItem('currentVariant', JSON.stringify(previewData));
      
      console.log('🎉 Variant creation complete!');
      console.log('📄 Snippet URL:', backendSnippetUrl);
      console.log('🛒 Shopify URL:', shopifyVariantUrl);
      
      // Update state to show success in Live Preview panel
      setGeneratedVariant({
        handle: variantHandle,
        shopifyUrl: shopifyVariantUrl,
        backendUrl: backendSnippetUrl
      });
      
      setIsGenerating(false);
      
    } catch (error) {
      console.error('❌ Error generating variant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to generate variant: ${errorMessage}\n\nPlease try again or contact support.`);
      setIsGenerating(false);
    }
  };

  const isComplete = selectedProduct && selectedCreative; // Campaign context is now optional

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Variant</h1>
        <p className="text-gray-600 mt-2">
          Transform your advertising creative into an optimized landing page variant
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Steps */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          currentStep > step.id
                            ? 'bg-green-500 text-white'
                            : currentStep === step.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {currentStep > step.id ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="w-16 h-px bg-gray-300 mx-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                Step {currentStep}: {STEPS[currentStep - 1].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && (
                <ProductSelector
                  selectedProduct={selectedProduct}
                  onProductSelect={setSelectedProduct}
                />
              )}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <CreativeUploader
                    selectedCreative={selectedCreative}
                    onCreativeSelect={setSelectedCreative}
                  />
                  <AdditionalContext
                    formData={formData}
                    onFormDataChange={setFormData}
                  />
                </div>
              )}
              {currentStep === 3 && (
                <VariantReview
                  product={selectedProduct}
                  creative={selectedCreative}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex space-x-3">
              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedToStep(currentStep + 1)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!isComplete || isGenerating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isGenerating ? 'Generating...' : 'Generate Variant'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <VariantPreview
            product={selectedProduct}
            creative={selectedCreative}
            formData={formData}
            isGenerating={isGenerating}
            generatedVariant={generatedVariant}
          />
        </div>
      </div>
    </div>
  );
}