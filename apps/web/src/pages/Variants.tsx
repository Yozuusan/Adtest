import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  ExternalLink, 
  Edit, 
  Play, 
  Pause, 
  Eye,
  Target,
  Copy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPercentage } from '@/lib/utils';

const mockVariants = [
  {
    id: '1',
    variant_handle: 'black-friday-urgent',
    product_id: '15096939610438',
    product_title: 'Savon à Barres de Noix de Coco',
    product_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco',
    variant_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=black-friday-urgent',
    status: 'active',
    campaign_context: 'Black Friday urgency campaign with limited time offer',
    tone_of_voice: 'urgent',
    target_audience: 'Deal-seeking customers',
    analytics: {
      impressions: 18920,
      clicks: 612,
      conversions: 89,
      revenue: 12450,
      conversion_rate: 0.145,
      ctr: 0.0323,
      roas: 5.1
    },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z'
  },
  {
    id: '2',
    variant_handle: 'summer-premium',
    product_id: '15096939610438',
    product_title: 'Savon à Barres de Noix de Coco',
    product_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco',
    variant_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=summer-premium',
    status: 'active',
    campaign_context: 'Summer collection highlighting premium natural ingredients',
    tone_of_voice: 'luxurious',
    target_audience: 'Premium beauty consumers',
    analytics: {
      impressions: 15830,
      clicks: 503,
      conversions: 54,
      revenue: 7890,
      conversion_rate: 0.107,
      ctr: 0.0318,
      roas: 3.8
    },
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-15T09:45:00Z'
  },
  {
    id: '3',
    variant_handle: 'luxury-collection',
    product_id: '15096939610438',
    product_title: 'Savon à Barres de Noix de Coco',
    product_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco',
    variant_url: 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=luxury-collection',
    status: 'paused',
    campaign_context: 'Luxury positioning with artisanal craftsmanship focus',
    tone_of_voice: 'authoritative',
    target_audience: 'High-end skincare enthusiasts',
    analytics: {
      impressions: 10920,
      clicks: 419,
      conversions: 44,
      revenue: 3110,
      conversion_rate: 0.105,
      ctr: 0.0383,
      roas: 2.9
    },
    created_at: '2024-01-12T09:15:00Z',
    updated_at: '2024-01-13T16:30:00Z'
  }
];

export function Variants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');

  const filteredVariants = mockVariants.filter(variant => {
    const matchesSearch = variant.variant_handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         variant.product_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || variant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Toast notification would go here
  };

  const handleStatusChange = (variantId: string, newStatus: 'active' | 'paused') => {
    // API call to update status
    console.log(`Updating variant ${variantId} to ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Variants</h1>
          <p className="text-gray-600 mt-1">
            Manage your landing page variants and their performance
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

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search variants by handle or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'paused', 'draft'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status === 'all' ? 'All' : status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants List */}
      <div className="space-y-4">
        {filteredVariants.map((variant) => (
          <Card key={variant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                {/* Variant Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {variant.variant_handle}
                    </h3>
                    <Badge 
                      variant={variant.status === 'active' ? 'success' : 
                              variant.status === 'paused' ? 'warning' : 'secondary'}
                    >
                      {variant.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{variant.product_title}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Campaign Context</p>
                      <p className="text-sm text-gray-900">{variant.campaign_context}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tone & Audience</p>
                      <p className="text-sm text-gray-900 capitalize">{variant.tone_of_voice} • {variant.target_audience}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Performance</p>
                      <p className="text-sm text-gray-900">
                        {formatPercentage(variant.analytics.conversion_rate)} CVR • {formatCurrency(variant.analytics.revenue)}
                      </p>
                    </div>
                  </div>

                  {/* Variant URL */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        <p className="text-xs text-gray-500 mb-1">Variant URL</p>
                        <p className="text-sm text-blue-600 font-mono break-all">
                          {variant.variant_url}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(variant.variant_url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(variant.variant_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Impressions</p>
                      <p className="font-medium">{variant.analytics.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Clicks</p>
                      <p className="font-medium">{variant.analytics.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Conversions</p>
                      <p className="font-medium">{variant.analytics.conversions}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">ROAS</p>
                      <p className="font-medium text-green-600">{variant.analytics.roas}x</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/variants/${variant.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(variant.variant_url, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>

                  {variant.status === 'active' ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(variant.id, 'paused')}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(variant.id, 'active')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVariants.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No variants found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first variant to get started'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/variants/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Variant
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}