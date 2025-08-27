import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BarChart3,
  Palette,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Variants',
    href: '/variants',
    icon: Target,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Brand',
    href: '/brand',
    icon: Palette,
  },
];

export function Sidebar() {
  const [shopDomain, setShopDomain] = useState<string | null>(null);

  useEffect(() => {
    setShopDomain(localStorage.getItem('shopDomain'));
  }, []);

  const disconnect = () => {
    localStorage.removeItem('shopDomain');
    setShopDomain(null);
  };

  const today = new Date();
  const dateLabel = `${today.getDate().toString().padStart(2, '0')} ${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}`;
  const versionLabel = `(${dateLabel} V1)`;

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Adlign {versionLabel}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <item.icon
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {shopDomain ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">{shopDomain}</div>
            <button
              onClick={disconnect}
              className="text-xs text-red-600 hover:underline"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <Button asChild className="w-full" size="sm">
            <Link to="/connect-store">Connect Store</Link>
          </Button>
        )}
      </div>
    </div>
  );
}