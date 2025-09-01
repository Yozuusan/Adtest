import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function DebugAuth() {
  const { user, session, userShops, currentShop, loading, fetchUserShops } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebug = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Running debug...');

      // 1. Vérifier l'état de l'authentification
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // 2. Tester la requête user_shops directement
      let userShopsTest = null;
      let userShopsError = null;
      
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_shops')
            .select(`
              id,
              user_id,
              shop_id,
              role,
              created_at,
              updated_at,
              shop:shops (
                id,
                domain,
                is_active,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', user.id);

          userShopsTest = { data, error };
        } catch (error) {
          userShopsError = error;
        }
      }

      // 3. Tester une requête simple
      let simpleTest = null;
      try {
        const { data, error } = await supabase
          .from('user_shops')
          .select('count', { count: 'exact', head: true });
        simpleTest = { data, error };
      } catch (error) {
        simpleTest = { error };
      }

      const debugData = {
        timestamp: new Date().toISOString(),
        auth: {
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          session: currentSession ? {
            access_token: currentSession.access_token ? 'Present' : 'Missing',
            refresh_token: currentSession.refresh_token ? 'Present' : 'Missing',
            expires_at: currentSession.expires_at
          } : null,
          loading
        },
        userShops: {
          context: userShops.length,
          currentShop: currentShop ? {
            id: currentShop.id,
            shop_id: currentShop.shop_id,
            role: currentShop.role,
            domain: currentShop.shop?.domain,
            is_active: currentShop.shop?.is_active
          } : null
        },
        directTest: {
          userShops: userShopsTest,
          userShopsError,
          simpleTest
        }
      };

      setDebugInfo(debugData);
      console.log('✅ Debug completed:', debugData);
    } catch (error) {
      console.error('❌ Debug error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = async () => {
    console.log('🔄 Force refreshing user shops...');
    await fetchUserShops();
  };

  useEffect(() => {
    runDebug();
  }, [user, userShops]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug Authentication</h1>
          <p className="text-gray-600 mt-1">
            Diagnostic de l'authentification et de la récupération des boutiques
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runDebug} disabled={isLoading}>
            {isLoading ? 'Running...' : 'Run Debug'}
          </Button>
          <Button onClick={forceRefresh} variant="outline">
            Force Refresh
          </Button>
        </div>
      </div>

      {/* État de l'authentification */}
      <Card>
        <CardHeader>
          <CardTitle>État de l'authentification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Utilisateur connecté:</span>
              <Badge variant={user ? 'default' : 'secondary'}>
                {user ? 'Connecté' : 'Non connecté'}
              </Badge>
            </div>
            
            {user && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Informations utilisateur:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>ID:</strong> {user.id}</div>
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Créé le:</strong> {new Date(user.created_at).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-medium">Session:</span>
              <Badge variant={session ? 'default' : 'secondary'}>
                {session ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Loading:</span>
              <Badge variant={loading ? 'default' : 'secondary'}>
                {loading ? 'En cours' : 'Terminé'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Boutiques de l'utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle>Boutiques de l'utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Nombre de boutiques:</span>
              <Badge variant="outline">{userShops.length}</Badge>
            </div>

            {currentShop && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Boutique actuelle:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>ID:</strong> {currentShop.id}</div>
                  <div><strong>Domaine:</strong> {currentShop.shop?.domain}</div>
                  <div><strong>Rôle:</strong> {currentShop.role}</div>
                  <div><strong>Active:</strong> {currentShop.shop?.is_active ? 'Oui' : 'Non'}</div>
                </div>
              </div>
            )}

            {userShops.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Toutes les boutiques:</h4>
                <div className="space-y-2">
                  {userShops.map((shop: any, index: number) => (
                    <div key={shop.id} className="text-sm border-l-2 border-gray-300 pl-3">
                      <div><strong>{index + 1}.</strong> {shop.shop?.domain || 'Domaine inconnu'}</div>
                      <div className="text-gray-600">Rôle: {shop.role} | Active: {shop.shop?.is_active ? 'Oui' : 'Non'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informations de debug détaillées */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de debug détaillées</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
