import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DebugSupabase() {
  const { user, session } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testSupabaseConnection = async () => {
    addLog('--- TEST CONNEXION SUPABASE ---');
    try {
      const { error } = await supabase
        .from('shops')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        addLog(`❌ Erreur connexion Supabase: ${error.message}`);
        addLog(`   Code: ${error.code}`);
        addLog(`   Details: ${error.details}`);
      } else {
        addLog('✅ Connexion Supabase OK - Table shops accessible');
      }
    } catch (err) {
      addLog(`❌ Exception Supabase: ${err}`);
    }
  };

  const testUserShopsTable = async () => {
    addLog('--- TEST TABLE USER_SHOPS ---');
    try {
      const { error: countError } = await supabase
        .from('user_shops')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        addLog(`❌ Erreur count user_shops: ${countError.message}`);
        addLog(`   Code: ${countError.code}`);
        addLog(`   Details: ${countError.details}`);
        addLog(`   Hint: ${countError.hint}`);
        return;
      }
      
      addLog('✅ Table user_shops accessible');
      
      if (user) {
        const { data: selectData, error: selectError } = await supabase
          .from('user_shops')
          .select('*')
          .eq('user_id', user.id);
          
        if (selectError) {
          addLog(`❌ Erreur select user_shops: ${selectError.message}`);
          addLog(`   Code: ${selectError.code}`);
          addLog(`   RLS Policy issue? ${selectError.hint}`);
        } else {
          addLog(`✅ Select user_shops OK - ${selectData?.length || 0} rows`);
          if (selectData && selectData.length > 0) {
            addLog(`   Data: ${JSON.stringify(selectData[0], null, 2)}`);
          }
        }
      }
    } catch (err) {
      addLog(`❌ Exception user_shops: ${err}`);
    }
  };

  const testUserShopsWithJoin = async () => {
    addLog('--- TEST USER_SHOPS AVEC JOIN ---');
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
          shop:shops!inner (
            id,
            shop_domain,
            shop_owner,
            email,
            is_active
          )
        `)
        .eq('user_id', user?.id || 'test');

      if (error) {
        addLog(`❌ Erreur JOIN user_shops: ${error.message}`);
        addLog(`   Code: ${error.code}`);
        addLog(`   Details: ${error.details}`);
      } else {
        addLog(`✅ JOIN user_shops OK - ${data?.length || 0} rows`);
      }
    } catch (err) {
      addLog(`❌ Exception JOIN: ${err}`);
    }
  };

  const testAuthStatus = () => {
    addLog('--- TEST STATUS AUTHENTIFICATION ---');
    addLog(`🔍 User: ${user ? '✅ Connecté' : '❌ Non connecté'}`);
    if (user) {
      addLog(`   - ID: ${user.id}`);
      addLog(`   - Email: ${user.email}`);
      addLog(`   - Role: ${user.role}`);
      addLog(`   - App Metadata: ${JSON.stringify(user.app_metadata)}`);
      addLog(`   - User Metadata: ${JSON.stringify(user.user_metadata)}`);
    }
    addLog(`🔍 Session: ${session ? '✅ Active' : '❌ Inactive'}`);
    if (session) {
      addLog(`   - Access Token: ${session.access_token ? 'Présent' : 'Manquant'}`);
      addLog(`   - Token Type: ${session.token_type}`);
      addLog(`   - Expires: ${session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}`);
    }
  };

  const testRLSPolicies = async () => {
    addLog('--- TEST POLICIES RLS ---');
    try {
      const { data, error } = await supabase.rpc('auth.uid');
      
      if (error) {
        addLog(`❌ Erreur auth.uid(): ${error.message}`);
      } else {
        addLog(`✅ auth.uid() retourne: ${data}`);
        addLog(`   Comparaison avec user.id: ${data === user?.id ? '✅ Match' : '❌ Différent'}`);
      }
    } catch (err) {
      addLog(`❌ Exception RLS: ${err}`);
    }
  };

  const insertTestUserShop = async () => {
    if (!user) {
      addLog('❌ Pas d\'utilisateur connecté pour le test d\'insertion');
      return;
    }
    
    addLog('--- TEST INSERTION USER_SHOPS ---');
    try {
      const testData = {
        user_id: user.id,
        shop_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'owner' as const
      };
      
      const { data, error } = await supabase
        .from('user_shops')
        .insert(testData)
        .select();

      if (error) {
        addLog(`❌ Erreur insertion: ${error.message}`);
        addLog(`   Code: ${error.code}`);
        addLog(`   Details: ${error.details}`);
      } else {
        addLog('✅ Insertion test réussie');
        addLog(`   ID créé: ${data?.[0]?.id}`);
        
        if (data?.[0]?.id) {
          await supabase.from('user_shops').delete().eq('id', data[0].id);
          addLog('🧹 Test data nettoyée');
        }
      }
    } catch (err) {
      addLog(`❌ Exception insertion: ${err}`);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Supabase - Diagnostic Complet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testAuthStatus} variant="outline">
              Test Auth Status
            </Button>
            <Button onClick={testSupabaseConnection} variant="outline">
              Test Connexion Supabase
            </Button>
            <Button onClick={testUserShopsTable} variant="outline">
              Test Table user_shops
            </Button>
            <Button onClick={testUserShopsWithJoin} variant="outline">
              Test JOIN user_shops
            </Button>
            <Button onClick={testRLSPolicies} variant="outline">
              Test RLS Policies
            </Button>
            <Button onClick={insertTestUserShop} variant="outline">
              Test Insert user_shops
            </Button>
            <Button onClick={clearLogs} variant="destructive">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📊 Informations Système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Non défini'}
            </div>
            <div>
              <strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Définie' : 'Non définie'}
            </div>
            <div>
              <strong>User ID:</strong> {user?.id || 'Non connecté'}
            </div>
            <div>
              <strong>Session Active:</strong> {session ? '✅ Oui' : '❌ Non'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Logs de Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click buttons above to start debugging.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔧 Actions de Debug</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>1. Test Auth Status:</strong> Vérifie l'état de l'authentification Supabase</p>
          <p><strong>2. Test Connexion:</strong> Vérifie l'accès général à Supabase</p>
          <p><strong>3. Test Table user_shops:</strong> Vérifie si la table user_shops est accessible</p>
          <p><strong>4. Test JOIN:</strong> Teste la requête complète avec jointure</p>
          <p><strong>5. Test RLS Policies:</strong> Vérifie les policies Row Level Security</p>
          <p><strong>6. Test Insert:</strong> Teste l'insertion dans user_shops</p>
        </CardContent>
      </Card>
    </div>
  );
}