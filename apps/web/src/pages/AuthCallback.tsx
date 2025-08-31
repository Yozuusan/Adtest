import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchUserShops } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const shop = searchParams.get('shop');
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const token = searchParams.get('token');

        if (error) {
          setStatus('error');
          setMessage(`Erreur d'authentification: ${error}`);
          return;
        }

        if (success && shop && token) {
          setStatus('success');
          setMessage(`Successfully connected to ${shop}!`);
          
          // Actualiser la liste des boutiques de l'utilisateur
          await fetchUserShops();
          
          // Stocker le shop domain pour compatibilité
          localStorage.setItem('shopDomain', shop);
          
          // Rediriger vers le dashboard après 2 secondes
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Paramètres d\'authentification manquants');
        }
      } catch (err) {
        setStatus('error');
        setMessage(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    };

    handleCallback();
  }, [searchParams, navigate, fetchUserShops]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentification en cours...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Connexion à votre boutique Shopify
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'success' ? (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Connexion réussie !
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Redirection vers le tableau de bord...
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Erreur de connexion
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/connect-store')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Réessayer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
