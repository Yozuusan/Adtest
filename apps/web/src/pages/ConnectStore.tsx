import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function ConnectStore() {
  const [shop, setShop] = useState('');
  const { user } = useAuth();
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  const handleConnect = () => {
    if (!shop || !user) return;
    const normalized = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    window.location.href = `${apiUrl}/oauth/install?shop=${encodeURIComponent(normalized)}&user_id=${user.id}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Connect your Shopify Store</h1>
      <p className="text-gray-600 text-sm">
        Enter your shop domain to begin authentication.
      </p>
      <Input
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        placeholder="your-store.myshopify.com"
      />
      <Button className="w-full" onClick={handleConnect} disabled={!shop}>
        Connect Store
      </Button>
    </div>
  );
}
