import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVariantStore } from '@/stores/useVariantStore';

export function Variants() {
  const { variants } = useVariantStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = variants.filter(v =>
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
          {!filtered.length ? (
            <p className="text-center text-gray-500">No variants yet.</p>
          ) : (
            <ul className="space-y-4">
              {filtered.map((variant) => (
                <li key={variant.id} className="border p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{variant.variant_handle}</p>
                  <p className="text-sm text-gray-600">{variant.product_title}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
