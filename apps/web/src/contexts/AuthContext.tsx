import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserShopWithShop } from '@/lib/supabase';

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
      console.log('🔍 Fetching user shops for user:', user.id);
      
      // Utiliser une requête plus simple sans inner join pour éviter les problèmes RLS
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
            shop_owner,
            email,
            country_code,
            currency,
            timezone,
            created_at,
            updated_at,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('shop.is_active', true);

      if (error) {
        console.error('❌ Error fetching user shops:', error);
        console.log('🔧 Error details:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        
        // Essayer une requête encore plus simple
        const { error: simpleError } = await supabase
          .from('user_shops')
          .select('*')
          .eq('user_id', user.id);

        if (simpleError) {
          console.error('❌ Simple query also failed:', simpleError);
          setUserShops([]);
          return;
        }

        console.log('✅ Simple query successful, but no shop details');
        setUserShops([]);
        return;
      }

      const shops = (data || []) as any;
      console.log(`✅ Successfully fetched ${shops.length} shops for user ${user.id}`);
      console.log('📋 Shops data:', shops.map((s: any) => ({
        id: s.id,
        shop_id: s.shop_id,
        role: s.role,
        shop_domain: s.shop?.domain,
        shop_active: s.shop?.is_active
      })));
      
      setUserShops(shops);
      
      // Set first shop as current if none selected
      if (shops.length > 0 && !currentShop) {
        const savedShopId = localStorage.getItem('currentShopId');
        const savedShop = savedShopId ? shops.find((s: any) => s.id === savedShopId) : null;
        setCurrentShop(savedShop || shops[0]);
        console.log('🎯 Set current shop:', savedShop || shops[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching user shops:', error);
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