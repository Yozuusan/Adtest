import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6">
      <div className="flex h-full items-center justify-between">
        {/* Breadcrumbs */}
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

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {location.pathname !== '/variants/new' && (
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
        </div>
      </div>
    </header>
  );
}