import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { Overview } from '@/pages/Overview';
import { Variants } from '@/pages/Variants';
import { NewVariant } from '@/pages/NewVariant';
import { VariantPreview } from '@/pages/VariantPreview';
import { ThemeMapping } from '@/pages/ThemeMapping';
import { Analytics } from '@/pages/Analytics';
import { Brand } from '@/pages/Brand';
import { ConnectStore } from '@/pages/ConnectStore';
import { AuthCallback } from '@/pages/AuthCallback';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { DebugOAuth } from '@/pages/DebugOAuth';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Overview />} />
          <Route path="variants" element={<Variants />} />
          <Route path="variants/new" element={<NewVariant />} />
          <Route path="variants/preview/:handle" element={<VariantPreview />} />
          <Route path="variants/mapping" element={<ThemeMapping />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="brand" element={<Brand />} />
          <Route path="connect-store" element={<ConnectStore />} />
          <Route path="debug-oauth" element={<DebugOAuth />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;