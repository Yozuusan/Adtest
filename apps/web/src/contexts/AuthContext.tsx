import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserShop } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userShops: UserShop[];
  currentShop: UserShop | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fetchUserShops: () => Promise<void>;
  setCurrentShop: (shop: UserShop | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userShops, setUserShops] = useState<UserShop[]>([]);
  const [currentShop, setCurrentShop] = useState<UserShop | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserShops = async () => {
    if (!user) return;

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
            shop_domain,
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
        console.error('Error fetching user shops:', error);
        return;
      }

      const shops = data || [];
      setUserShops(shops);
      
      // Set first shop as current if none selected
      if (shops.length > 0 && !currentShop) {
        const savedShopId = localStorage.getItem('currentShopId');
        const savedShop = savedShopId ? shops.find(s => s.id === savedShopId) : null;
        setCurrentShop(savedShop || shops[0]);
      }
    } catch (error) {
      console.error('Error fetching user shops:', error);
    }
  };

  const handleSetCurrentShop = (shop: UserShop | null) => {
    setCurrentShop(shop);
    if (shop) {
      localStorage.setItem('currentShopId', shop.id);
      localStorage.setItem('shopDomain', shop.shop?.shop_domain || '');
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