import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';

export function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to Adlign
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Optimize your Shopify product pages with AI-powered variants
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <Auth 
            supabaseClient={supabase}
            view="sign_in"
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: {
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '6px',
                },
                anchor: {
                  color: '#2563eb',
                },
                message: {
                  color: '#dc2626',
                }
              }
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/`}
          />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}