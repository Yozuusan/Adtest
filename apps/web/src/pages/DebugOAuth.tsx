import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DebugOAuth() {
  const { user, session } = useAuth();
  const [shop, setShop] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [apiUrl, setApiUrl] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('');

  useEffect(() => {
    const detectedApiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    const detectedFrontendUrl = window.location.origin;
    
    setApiUrl(detectedApiUrl);
    setFrontendUrl(detectedFrontendUrl);
    
    addLog(`🔧 Frontend URL détectée: ${detectedFrontendUrl}`);
    addLog(`🔧 API URL configurée: ${detectedApiUrl}`);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testAuthStatus = () => {
    addLog('--- TEST D\'AUTHENTIFICATION ---');
    addLog(`🔍 User: ${user ? '✅ Connecté' : '❌ Non connecté'}`);
    if (user) {
      addLog(`   - ID: ${user.id}`);
      addLog(`   - Email: ${user.email}`);
      addLog(`   - Created: ${user.created_at}`);
    }
    addLog(`🔍 Session: ${session ? '✅ Active' : '❌ Inactive'}`);
    if (session) {
      addLog(`   - Access Token: ${session.access_token ? 'Présent' : 'Manquant'}`);
      addLog(`   - Expires: ${session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}`);
    }
  };

  const testAPIConnection = async () => {
    addLog('--- TEST DE CONNEXION API ---');
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ API accessible: ${response.status}`);
        addLog(`   Response: ${JSON.stringify(data)}`);
      } else {
        addLog(`❌ API erreur: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog(`❌ API inaccessible: ${error}`);
    }
  };

  const testOAuthURL = () => {
    if (!shop || !user) {
      addLog('❌ Shop ou user manquant pour générer l\'URL OAuth');
      return;
    }

    addLog('--- GÉNÉRATION URL OAUTH ---');
    const normalized = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const oauthUrl = `${apiUrl}/oauth/install?shop=${encodeURIComponent(normalized)}&user_id=${user.id}`;
    
    addLog(`🔗 Shop normalisé: ${normalized}`);
    addLog(`🔗 User ID: ${user.id}`);
    addLog(`🔗 URL générée: ${oauthUrl}`);
    
    // Test de l'URL avant redirection
    fetch(oauthUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => addLog('✅ URL OAuth accessible'))
      .catch(() => addLog('⚠️ Impossible de vérifier l\'URL OAuth (CORS)'));
  };

  const handleTestOAuth = () => {
    if (!shop || !user) {
      addLog('❌ Veuillez entrer un shop et vous assurer d\'être connecté');
      return;
    }

    testOAuthURL();
    
    addLog('--- REDIRECTION OAUTH ---');
    const normalized = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const oauthUrl = `${apiUrl}/oauth/install?shop=${encodeURIComponent(normalized)}&user_id=${user.id}`;
    
    addLog('🚀 Redirection vers Shopify...');
    window.location.href = oauthUrl;
  };

  const testBackendOAuth = async () => {
    if (!shop || !user) {
      addLog('❌ Shop ou user manquant');
      return;
    }

    addLog('--- TEST BACKEND OAUTH ---');
    const normalized = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    
    try {
      const response = await fetch(`${apiUrl}/oauth/install?shop=${encodeURIComponent(normalized)}&user_id=${user.id}`, {
        method: 'GET',
        redirect: 'manual', // Empêche la redirection automatique
        headers: {
          'Origin': window.location.origin,
          'Referer': window.location.href,
        },
      });
      
      addLog(`📡 Response status: ${response.status}`);
      addLog(`📡 Response type: ${response.type}`);
      
      if (response.status === 0) {
        addLog('⚠️ Response opaque (redirection bloquée par CORS)');
      } else if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        addLog(`🔄 Redirection détectée vers: ${location}`);
      } else {
        const text = await response.text();
        addLog(`📄 Response body: ${text}`);
      }
    } catch (error) {
      addLog(`❌ Erreur lors du test backend: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🐛 Debug OAuth - Shopify Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Shop Domain:</label>
              <Input
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="your-store.myshopify.com"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testAuthStatus} variant="outline">
              Test Auth Status
            </Button>
            <Button onClick={testAPIConnection} variant="outline">
              Test API Connection
            </Button>
            <Button onClick={testOAuthURL} variant="outline">
              Generate OAuth URL
            </Button>
            <Button onClick={testBackendOAuth} variant="outline">
              Test Backend OAuth
            </Button>
            <Button onClick={handleTestOAuth} className="bg-green-600 hover:bg-green-700">
              Start OAuth Flow
            </Button>
            <Button onClick={clearLogs} variant="destructive">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📊 System Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Frontend URL:</strong> {frontendUrl}
            </div>
            <div>
              <strong>API URL:</strong> {apiUrl}
            </div>
            <div>
              <strong>User Status:</strong> {user ? `✅ ${user.email}` : '❌ Not logged in'}
            </div>
            <div>
              <strong>Session:</strong> {session ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Debug Logs</CardTitle>
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
          <CardTitle>💡 Debug Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>1. Test Auth Status:</strong> Vérifiez que l'utilisateur est bien connecté</p>
          <p><strong>2. Test API Connection:</strong> Vérifiez que le backend est accessible</p>
          <p><strong>3. Generate OAuth URL:</strong> Voir l'URL qui sera générée sans la lancer</p>
          <p><strong>4. Test Backend OAuth:</strong> Testez l'endpoint OAuth sans redirection</p>
          <p><strong>5. Start OAuth Flow:</strong> Lance le processus complet (vous serez redirigé)</p>
        </CardContent>
      </Card>
    </div>
  );
}