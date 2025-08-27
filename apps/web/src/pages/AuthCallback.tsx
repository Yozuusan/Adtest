import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const success = params.get('success');
    const err = params.get('error');

    if (err) {
      setError(err);
      return;
    }

    if (success && shop) {
      localStorage.setItem('shopDomain', shop);
      navigate('/');
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Authentication failed: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-center">
      <p className="text-gray-700">Completing authentication...</p>
    </div>
  );
}
