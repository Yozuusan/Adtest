import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Users, ShoppingCart, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVariantStore } from '@/stores/useVariantStore';

export function Overview() {
  const { 
    dashboardStats, 
    variants, 
    isLoading, 
    error, 
    fetchAnalytics, 
    fetchVariants,
    currentShop 
  } = useVariantStore();

  useEffect(() => {
    const shop = localStorage.getItem('shopDomain');
    if (shop) {
      fetchAnalytics(shop);
      fetchVariants(shop);
    }
  }, [fetchAnalytics, fetchVariants]);

  const getShopDomain = () => {
    return localStorage.getItem('shopDomain') || 'Not connected';
  };

  const getConnectionStatus = () => {
    const shop = localStorage.getItem('shopDomain');
    return shop ? 'Connected' : 'Not connected';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back! 👋</h1>
            <p className="text-gray-600 mt-1">
              {currentShop ? `Connected to ${currentShop}` : 'Connect your Shopify store to get started'}
            </p>
          </div>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link to="/variants/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Variant
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{variants.length}</div>
            <p className="text-xs text-muted-foreground">
              {variants.length === 0 ? 'No variants yet' : 'Active variants'}
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
              {dashboardStats?.conversion_rate ? `${dashboardStats.conversion_rate.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.conversion_rate ? 'Average across variants' : 'No data yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats?.events_by_type?.variant_view || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.events_by_type?.variant_view ? 'Variant impressions' : 'No traffic yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats?.events_by_type?.variant_click || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.events_by_type?.variant_click ? 'CTA interactions' : 'No clicks yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Variants</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading...</p>
              </div>
            ) : variants.length > 0 ? (
              <div className="space-y-3">
                {variants.slice(0, 3).map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{variant.variant_handle}</p>
                      <p className="text-sm text-gray-600">{variant.product_title}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/variants/preview/${variant.variant_handle}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
                {variants.length > 3 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/variants">View All Variants</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No variants yet</p>
                <p className="text-sm text-gray-500 mt-1">Create your first variant to get started</p>
                <Button className="mt-4" asChild>
                  <Link to="/variants/new">Create Variant</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/variants/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Variant
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/variants/mapping">
                <Target className="mr-2 h-4 w-4" />
                Theme Mapping
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/brand">
                <Users className="mr-2 h-4 w-4" />
                Brand Analysis
              </Link>
            </Button>
          </CardContent>
        </Card>
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

      {/* Store Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Store Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status: <span className="font-medium">{getConnectionStatus()}</span></p>
              <p className="text-sm text-gray-600">Domain: <span className="font-medium">{getShopDomain()}</span></p>
            </div>
            {!currentShop && (
              <Button asChild>
                <Link to="/connect-store">Connect Store</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
