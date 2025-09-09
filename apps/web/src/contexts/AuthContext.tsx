import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserShopWithShop } from '@/lib/supabase';
import { apiService } from '@/services/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userShops: UserShopWithShop[];
  currentShop: UserShopWithShop | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fetchUserShops: () => Promise<void>;
  setCurrentShop: (shop: UserShopWithShop | null) => void;
  forceRefreshShops: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userShops, setUserShops] = useState<UserShopWithShop[]>([]);
  const [currentShop, setCurrentShop] = useState<UserShopWithShop | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialiser l'authentification Supabase
  useEffect(() => {
    // Récupérer la session initiale
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Si l'utilisateur se connecte, récupérer ses boutiques
        if (session?.user && event === 'SIGNED_IN') {
          // Attendre un peu pour s'assurer que l'état est mis à jour
          setTimeout(async () => {
            await fetchUserShops();
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          setUserShops([]);
          setCurrentShop(null);
          localStorage.removeItem('currentShopId');
          localStorage.removeItem('shopDomain');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Récupérer les boutiques quand l'utilisateur change
  useEffect(() => {
    if (user && !loading) {
      console.log('👤 User changed, fetching shops for:', user.id);
      fetchUserShops();
    }
  }, [user, loading]);

  const fetchUserShops = async () => {
    if (!user) {
      console.log('⚠️ No user available for fetching shops');
      return;
    }

    try {
      console.log('🔍 Fetching user shops via API for user:', user.id);
      
      // Utiliser l'API backend qui a les privilèges service-role
      const userShopsData = await apiService.getUserShops(user.id);

      console.log('📋 User shops data from API:', userShopsData);

      // Les données viennent déjà avec la structure correcte depuis le backend
      setUserShops(userShopsData);
      
      // Set first shop as current if none selected
      if (userShopsData.length > 0 && !currentShop) {
        const savedShopId = localStorage.getItem('currentShopId');
        const savedShop = savedShopId ? userShopsData.find(s => s.id === savedShopId) : null;
        const shopToSet = savedShop || userShopsData[0];
        setCurrentShop(shopToSet);
        console.log('🎯 Set current shop:', shopToSet);
        console.log('🎯 Current shop domain:', shopToSet?.shop?.domain);
        
        // Store shop domain in localStorage for API calls
        if (shopToSet?.shop?.domain) {
          localStorage.setItem('shopDomain', shopToSet.shop.domain);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user shops via API:', error);
      setUserShops([]);
    }
  };

  const handleSetCurrentShop = (shop: UserShopWithShop | null) => {
    setCurrentShop(shop);
    if (shop && shop.shop) {
      localStorage.setItem('currentShopId', shop.id);
      localStorage.setItem('shopDomain', shop.shop.domain || '');
    } else {
      localStorage.removeItem('currentShopId');
      localStorage.removeItem('shopDomain');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserShops([]);
    setCurrentShop(null);
    localStorage.removeItem('currentShopId');
    localStorage.removeItem('shopDomain');
  };

  const forceRefreshShops = async () => {
    setLoading(true);
    await fetchUserShops();
    setLoading(false);
  };

  const value = {
    user,
    session,
    userShops,
    currentShop,
    loading,
    signOut,
    fetchUserShops,
    setCurrentShop: handleSetCurrentShop,
    forceRefreshShops,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}