import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Eye, MousePointer, ShoppingCart, BarChart3 } from 'lucide-react';
import { useVariantStore } from '@/stores/useVariantStore';
import { apiService } from '@/services/api';

export function Analytics() {
  const { currentShop } = useVariantStore();
  const [period, setPeriod] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const shop = localStorage.getItem('shopDomain');
    if (shop) {
      fetchAnalyticsData(shop, period);
      fetchEventsData(shop);
    }
  }, [period]);

  const fetchAnalyticsData = async (shop: string, period: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getAnalyticsStats(shop, period);
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventsData = async (shop: string) => {
    try {
      const data = await apiService.getAnalyticsEvents(shop, 20, 0);
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const getShopDomain = () => {
    return localStorage.getItem('shopDomain') || 'Not connected';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentShop) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Performance insights for your landing page variants
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No store connected</p>
            <p className="text-sm text-gray-500 mb-4">Connect your Shopify store to view analytics</p>
            <Button asChild>
              <a href="/connect-store">Connect Store</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Performance insights for your landing page variants
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchAnalyticsData(currentShop, period)}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatNumber(analyticsData?.events_by_type?.variant_view || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {period === '1d' ? 'Last 24 hours' : `Last ${period}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatNumber(analyticsData?.events_by_type?.variant_click || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              CTA interactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatNumber(analyticsData?.events_by_type?.variant_conversion || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : 
                analyticsData?.conversion_rate ? 
                `${analyticsData.conversion_rate.toFixed(1)}%` : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Views to conversions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Variants */}
      {analyticsData?.top_variants && analyticsData.top_variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.top_variants.slice(0, 5).map((variant: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div>
                      <p className="font-medium text-gray-900">{variant.handle}</p>
                      <p className="text-sm text-gray-600">{variant.views} views</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{variant.conversions} conversions</p>
                    <p className="text-sm text-gray-600">
                      {(variant.conversion_rate * 100).toFixed(1)}% rate
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={
                      event.event_type === 'variant_conversion' ? 'default' :
                      event.event_type === 'variant_click' ? 'secondary' :
                      'outline'
                    }>
                      {event.event_type}
                    </Badge>
                    <div>
                      <p className="font-medium text-gray-900">{event.variant_handle}</p>
                      <p className="text-sm text-gray-600">{event.shop}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{formatDate(event.timestamp)}</p>
                    <p className="text-xs text-gray-500">{event.user_agent?.substring(0, 30)}...</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No events yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Events will appear here once your variants start receiving traffic
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Connected Store</p>
              <p className="text-sm text-gray-900">{getShopDomain()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Analysis Period</p>
              <p className="text-sm text-gray-900">
                {period === '1d' ? 'Last 24 hours' : 
                 period === '7d' ? 'Last 7 days' :
                 period === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
