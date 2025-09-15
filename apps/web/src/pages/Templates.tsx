import { useState, useEffect } from 'react';
import { Wand2, Package, Plus, Trash2, ExternalLink, Crown, Loader, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTemplateStore } from '@/stores/useTemplateStore';

const PLAN_COLORS = {
  basic: 'bg-gray-100 text-gray-800',
  pro: 'bg-blue-100 text-blue-800',
  business: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-gold-100 text-gold-800'
};

const PLAN_NAMES = {
  basic: 'Basic',
  pro: 'Pro', 
  business: 'Business',
  enterprise: 'Enterprise'
};

export function Templates() {
  const { user } = useAuth();
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  const {
    quota,
    templates,
    products,
    isLoading,
    isGenerating,
    error,
    fetchQuotaAndTemplates,
    fetchProducts,
    generateTemplate,
    deleteTemplate,
    setError
  } = useTemplateStore();
  
  const shopDomain = localStorage.getItem('shopDomain') || 'adlign.myshopify.com';

  // Fetch quota and templates
  useEffect(() => {
    fetchQuotaAndTemplates(shopDomain);
  }, [fetchQuotaAndTemplates]);

  const handleFetchProducts = async () => {
    await fetchProducts(shopDomain);
    setShowProductSelector(true);
  };

  const handleGenerateTemplate = async (productId: string, productHandle: string) => {
    const success = await generateTemplate(shopDomain, productId, productHandle);
    if (success) {
      setShowProductSelector(false);
      alert('Template généré avec succès!');
    } else {
      alert(`Erreur: ${error}`);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce template?')) return;
    
    const success = await deleteTemplate(shopDomain, templateId);
    if (!success) {
      alert(`Erreur: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin mr-2" />
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates Auto-Deploy</h1>
          <p className="text-gray-600 mt-1">
            Génération automatique de templates personnalisés pour vos produits
          </p>
        </div>
        <Button 
          onClick={handleFetchProducts}
          disabled={quota?.quota_exceeded}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Générer Nouveau Template
        </Button>
      </div>

      {/* Quota Card */}
      {quota && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Plan & Quota</CardTitle>
              <Badge className={PLAN_COLORS[quota.plan_type as keyof typeof PLAN_COLORS]}>
                <Crown className="mr-1 h-3 w-3" />
                {PLAN_NAMES[quota.plan_type as keyof typeof PLAN_NAMES]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates utilisés ce mois</p>
                <p className="text-2xl font-bold">
                  {quota.templates_used} / {quota.templates_limit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Restants</p>
                <p className={`text-2xl font-bold ${quota.templates_remaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {quota.templates_remaining}
                </p>
              </div>
            </div>
            
            {quota.quota_exceeded && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">
                    Quota dépassé. <a href="#" className="underline">Upgradez votre plan</a> pour continuer.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Selector Modal */}
      {showProductSelector && (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner un produit</CardTitle>
            <p className="text-sm text-gray-600">
              Choisissez le produit pour lequel générer un template automatique
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className={`p-4 border rounded-lg flex items-center justify-between ${
                    product.hasTemplate ? 'bg-gray-50 border-gray-200' : 'hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-gray-600">{product.handle}</p>
                    </div>
                  </div>
                  
                  {product.hasTemplate ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Template existant
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => handleGenerateTemplate(product.id, product.handle)}
                      disabled={isGenerating === product.id || quota?.quota_exceeded}
                      size="sm"
                    >
                      {isGenerating === product.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        'Générer'
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowProductSelector(false)}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Templates Actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center p-8">
              <Wand2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Aucun template généré pour le moment</p>
              <Button 
                onClick={handleFetchProducts}
                disabled={quota?.quota_exceeded}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer votre premier template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className="border p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="font-medium">{template.product_handle}</p>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 ${
                            template.deployment_status === 'deployed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {template.deployment_status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span>Confiance: {(template.confidence_avg * 100).toFixed(0)}%</span>
                        <span>Créé: {new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {template.test_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(template.test_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Tester
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}