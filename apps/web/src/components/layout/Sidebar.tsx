import { NavLink } from 'react-router-dom';
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
  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Adlign</span>
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
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-300" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Demo User</p>
            <p className="text-xs text-gray-500">adlign.myshopify.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}