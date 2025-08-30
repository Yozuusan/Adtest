import { useState, useEffect } from 'react';
import { Search, Package, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useVariantStore } from '@/stores/useVariantStore';

interface ProductSelectorProps {
  selectedProduct: Product | null;
  onProductSelect: (product: Product) => void;
}

export function ProductSelector({ selectedProduct, onProductSelect }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { products, isLoading, error, fetchProducts, currentShop } = useVariantStore();

  useEffect(() => {
    // Get shop from localStorage or use default
    const shop = localStorage.getItem('shopDomain') || 'adlign.myshopify.com';
    if (shop) {
      fetchProducts(shop, searchTerm);
    }
  }, [searchTerm, fetchProducts]);

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search products by name or handle..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Selected Product */}
      {selectedProduct && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{selectedProduct.title}</p>
                <p className="text-sm text-blue-700">Selected product</p>
              </div>
            </div>
            <Badge variant="default">Selected</Badge>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedProduct?.id === product.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onProductSelect(product)}
            >
              <div className="flex items-center space-x-4">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{product.title}</h3>
                  <p className="text-sm text-gray-500">Handle: {product.handle}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                      {product.status}
                    </Badge>
                    <span className="text-xs text-gray-500">{product.product_type}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(product.product_url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'Connect your Shopify store to see products'}
            </p>
          </div>
        )}
      </div>

      {/* Connect Store Button if no products */}
      {!isLoading && products.length === 0 && !currentShop && (
        <div className="text-center">
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/connect-store'}>
            <Package className="mr-2 h-4 w-4" />
            Connect Shopify Store
          </Button>
        </div>
      )}
    </div>
  );
}