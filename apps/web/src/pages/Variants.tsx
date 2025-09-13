import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Target, Loader } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVariantStore } from '@/stores/useVariantStore';

export function Variants() {
  const { variants, isLoading, error, fetchVariants } = useVariantStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch variants when component mounts
  useEffect(() => {
    const shop = localStorage.getItem('shopDomain') || 'adlign.myshopify.com';
    fetchVariants(shop);
  }, [fetchVariants]);

  // Defensive check - ensure variants is an array before filtering
  const safeVariants = Array.isArray(variants) ? variants : [];
  const filtered = safeVariants.filter(v =>
    v.variant_handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.product_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Variants</h1>
          <p className="text-gray-600 mt-1">
            Manage your landing page variants
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button asChild variant="outline">
            <Link to="/variants/mapping">
              <Target className="mr-2 h-4 w-4" />
              Theme Mapping
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/variants/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Variant
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Input
            placeholder="Search variants by handle or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mb-4"
          />
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="h-6 w-6 animate-spin mr-2" />
              <p className="text-gray-500">Loading variants...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8">
              <p className="text-red-600 mb-2">Error loading variants: {error}</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          ) : error && error.includes('No shop') ? (
            <div className="text-center p-8">
              <p className="text-gray-500 mb-2">No shop connected</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/connect-store">Connect Store</Link>
              </Button>
            </div>
          ) : !filtered.length && searchTerm ? (
            <p className="text-center text-gray-500 p-8">
              No variants found matching "{searchTerm}"
            </p>
          ) : !safeVariants.length ? (
            <div className="text-center p-8">
              <p className="text-gray-500 mb-2">No variants yet.</p>
              <Button asChild size="sm">
                <Link to="/variants/new">Create Your First Variant</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((variant) => (
                <li key={variant.id} className="border p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{variant.variant_handle}</p>
                      <p className="text-sm text-gray-600">{variant.product_title}</p>
                      {variant.status && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          variant.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : variant.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {variant.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
