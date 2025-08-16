import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Activity,
  Plus,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVariantStore } from '@/stores/useVariantStore';
import { formatCurrency, formatPercentage } from '@/lib/utils';

const mockStats = {
  total_variants: 12,
  active_campaigns: 8,
  avg_conversion_rate: 0.034,
  total_revenue_impact: 47580,
};

const mockVariants = [
  {
    id: '1',
    variant_handle: 'black-friday-urgent',
    product_title: 'Savon à Barres de Noix de Coco',
    status: 'active' as const,
    analytics: {
      conversion_rate: 0.042,
      revenue: 12450,
      impressions: 8940,
    },
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    variant_handle: 'summer-premium',
    product_title: 'Savon à Barres de Noix de Coco',
    status: 'active' as const,
    analytics: {
      conversion_rate: 0.038,
      revenue: 9850,
      impressions: 6720,
    },
    created_at: '2024-01-14T14:20:00Z',
  },
  {
    id: '3',
    variant_handle: 'luxury-collection',
    product_title: 'Savon à Barres de Noix de Coco',
    status: 'paused' as const,
    analytics: {
      conversion_rate: 0.028,
      revenue: 5680,
      impressions: 4150,
    },
    created_at: '2024-01-12T09:15:00Z',
  },
];

export function Overview() {
  const { setDashboardStats, setVariants } = useVariantStore();

  useEffect(() => {
    // Simulate API calls
    setDashboardStats(mockStats);
    setVariants(mockVariants as any);
  }, [setDashboardStats, setVariants]);

  const stats = [
    {
      title: 'Total Variants',
      value: mockStats.total_variants.toString(),
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Campaigns',
      value: mockStats.active_campaigns.toString(),
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Avg. Conversion Rate',
      value: formatPercentage(mockStats.avg_conversion_rate),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Revenue Impact',
      value: formatCurrency(mockStats.total_revenue_impact),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your landing page variants
            </p>
          </div>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link to="/variants/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Variant
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Variants</CardTitle>
            <Link 
              to="/analytics"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              View all
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockVariants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900">
                      {variant.variant_handle}
                    </h3>
                    <Badge 
                      variant={variant.status === 'active' ? 'success' : 'secondary'}
                    >
                      {variant.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {variant.product_title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPercentage(variant.analytics?.conversion_rate || 0)} CR
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(variant.analytics?.revenue || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/variants/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Variant
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Performance Analytics
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/brand">
                <Target className="mr-2 h-4 w-4" />
                Configure Brand Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Best Performing</span>
                <span className="text-sm font-medium">black-friday-urgent</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="text-sm font-medium text-green-600">4.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Revenue Impact</span>
                <span className="text-sm font-medium">{formatCurrency(12450)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}