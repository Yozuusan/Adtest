import { useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/utils';

const mockAnalytics = {
  overview: {
    total_impressions: 45670,
    total_clicks: 1534,
    total_conversions: 187,
    total_revenue: 23450,
    avg_ctr: 0.0336,
    avg_conversion_rate: 0.122,
    avg_cpc: 2.45,
    roas: 4.2
  },
  variants: [
    {
      id: '1',
      variant_handle: 'black-friday-urgent',
      product_title: 'Savon à Barres de Noix de Coco',
      status: 'active',
      impressions: 18920,
      clicks: 612,
      conversions: 89,
      revenue: 12450,
      ctr: 0.0323,
      conversion_rate: 0.145,
      cpc: 2.20,
      roas: 5.1
    },
    {
      id: '2',
      variant_handle: 'summer-premium',
      product_title: 'Savon à Barres de Noix de Coco',
      status: 'active',
      impressions: 15830,
      clicks: 503,
      conversions: 54,
      revenue: 7890,
      ctr: 0.0318,
      conversion_rate: 0.107,
      cpc: 2.65,
      roas: 3.8
    },
    {
      id: '3',
      variant_handle: 'luxury-collection',
      product_title: 'Savon à Barres de Noix de Coco',
      status: 'paused',
      impressions: 10920,
      clicks: 419,
      conversions: 44,
      revenue: 3110,
      ctr: 0.0383,
      conversion_rate: 0.105,
      cpc: 2.88,
      roas: 2.9
    }
  ]
};

export function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const { overview, variants } = mockAnalytics;

  const overviewStats = [
    {
      title: 'Total Impressions',
      value: formatNumber(overview.total_impressions),
      icon: Eye,
      change: '+12.5%',
      trend: 'up'
    },
    {
      title: 'Total Clicks',
      value: formatNumber(overview.total_clicks),
      icon: MousePointer,
      change: '+8.2%',
      trend: 'up'
    },
    {
      title: 'Total Conversions',
      value: formatNumber(overview.total_conversions),
      icon: ShoppingCart,
      change: '+15.7%',
      trend: 'up'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(overview.total_revenue),
      icon: DollarSign,
      change: '+22.4%',
      trend: 'up'
    }
  ];

  const performanceStats = [
    {
      title: 'Average CTR',
      value: formatPercentage(overview.avg_ctr),
      description: 'Click-through rate'
    },
    {
      title: 'Average CVR',
      value: formatPercentage(overview.avg_conversion_rate),
      description: 'Conversion rate'
    },
    {
      title: 'Average CPC',
      value: formatCurrency(overview.avg_cpc),
      description: 'Cost per click'
    },
    {
      title: 'Average ROAS',
      value: `${overview.roas}x`,
      description: 'Return on ad spend'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Performance insights for your landing page variants
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {['7d', '30d', '90d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Custom Range
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <div className="flex items-center">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {performanceStats.map((stat) => (
              <div key={stat.title} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600 mt-1">{stat.title}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Variants Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Variant Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Variant</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Impressions</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Clicks</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">CTR</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Conversions</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">CVR</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{variant.variant_handle}</p>
                        <p className="text-sm text-gray-500">{variant.product_title}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={variant.status === 'active' ? 'success' : 'secondary'}>
                        {variant.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatNumber(variant.impressions)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatNumber(variant.clicks)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatPercentage(variant.ctr)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatNumber(variant.conversions)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-medium ${
                        variant.conversion_rate > 0.12 ? 'text-green-600' : 
                        variant.conversion_rate > 0.08 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(variant.conversion_rate)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatCurrency(variant.revenue)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-medium ${
                        variant.roas > 4 ? 'text-green-600' : 
                        variant.roas > 3 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {variant.roas}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}