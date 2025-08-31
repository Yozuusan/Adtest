import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Plus, Target, LogOut, Store, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const pageNames: Record<string, string> = {
  '/': 'Overview',
  '/variants': 'Variants',
  '/variants/new': 'New Variant',
  '/variants/mapping': 'Theme Mapping',
  '/analytics': 'Analytics',
  '/brand': 'Brand',
};

export function Header() {
  const location = useLocation();
  const currentPage = pageNames[location.pathname] || 'Dashboard';
  const { user, currentShop, userShops, signOut, setCurrentShop } = useAuth();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6">
      <div className="flex h-full items-center justify-between">
        {/* Breadcrumbs + Shop Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            {location.pathname !== '/' && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-xl font-semibold text-gray-900">
                  {currentPage}
                </span>
              </>
            )}
          </div>

          {/* Shop Selector */}
          {userShops.length > 0 && (
            <div className="relative">
              <select
                value={currentShop?.id || ''}
                onChange={(e) => {
                  const shop = userShops.find(s => s.id === e.target.value);
                  setCurrentShop(shop || null);
                }}
                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a store...</option>
                {userShops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.shop?.shop_domain || 'Unknown Store'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Actions + User Menu */}
        <div className="flex items-center space-x-4">
          {location.pathname !== '/variants/new' && currentShop && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/variants/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Variant
              </Link>
            </Button>
          )}
          {location.pathname === '/variants' && (
            <Button asChild variant="outline">
              <Link to="/variants/mapping">
                <Target className="mr-2 h-4 w-4" />
                Theme Mapping
              </Link>
            </Button>
          )}
          
          {/* Connect Store Button */}
          {userShops.length === 0 && (
            <Button asChild variant="outline">
              <Link to="/connect-store">
                <Store className="mr-2 h-4 w-4" />
                Connect Store
              </Link>
            </Button>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}