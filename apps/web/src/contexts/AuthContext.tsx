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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userShops, setUserShops] = useState<UserShopWithShop[]>([]);
  const [currentShop, setCurrentShop] = useState<UserShopWithShop | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserShops = async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching user shops for user:', user.id);
      
      // Test if user_shops table is accessible (migration and RLS policies)
      const { error: checkError } = await supabase
        .from('user_shops')
        .select('count', { count: 'exact', head: true });
      
      if (checkError) {
        console.warn('⚠️ Cannot access user_shops table:', checkError.message);
        console.log(`   Error code: ${checkError.code}`);
        console.log(`   Error details: ${checkError.details}`);
        console.log('📝 This could be due to RLS policies or missing migration');
        console.log('🔧 Use /debug-supabase to diagnose the issue');
        setUserShops([]);
        return;
      }
      
      console.log('✅ user_shops table is accessible, fetching data...');
      
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
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error fetching user shops:', error);
        console.log('🔧 Trying alternative query without inner join...');
        
        // Fallback: essayer sans inner join
        const { data: fallbackData, error: fallbackError } = await supabase
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
          .eq('user_id', user.id);

        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          setUserShops([]);
          return;
        }

        const shops = (fallbackData || []) as any;
        console.log('✅ Fallback query successful, shops found:', shops.length);
        setUserShops(shops);
        
        // Set first shop as current if none selected
        if (shops.length > 0 && !currentShop) {
          const savedShopId = localStorage.getItem('currentShopId');
          const savedShop = savedShopId ? shops.find((s: any) => s.id === savedShopId) : null;
          setCurrentShop(savedShop || shops[0]);
          console.log('🎯 Set current shop from fallback:', savedShop || shops[0]);
        }
        return;
      }

      const shops = (data || []) as any;
      setUserShops(shops);
      
      console.log(`✅ Main query successful: Fetched ${shops.length} shops for user ${user.id}`);
      console.log('📋 Shops data:', shops.map((s: any) => ({
        id: s.id,
        shop_id: s.shop_id,
        role: s.role,
        shop_domain: s.shop?.domain,
        shop_active: s.shop?.is_active
      })));
      
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
    if (shop) {
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          setUserShops([]);
          setCurrentShop(null);
          localStorage.removeItem('currentShopId');
          localStorage.removeItem('shopDomain');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user shops when user is authenticated
  useEffect(() => {
    if (user) {
      fetchUserShops();
    }
  }, [user]);

  const value = {
    user,
    session,
    userShops,
    currentShop,
    loading,
    signOut,
    fetchUserShops,
    setCurrentShop: handleSetCurrentShop,
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