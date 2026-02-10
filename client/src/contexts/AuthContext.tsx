import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  capabilities: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuth = async () => {
    try {
      setIsLoading(true);
      
      // Get WordPress user from window object (injected by shortcode)
      const wpUser = (window as any).wpUser;
      
      if (wpUser && wpUser.isLoggedIn) {
        setUser({
          id: wpUser.id,
          username: wpUser.username,
          email: wpUser.email,
          roles: wpUser.roles,
          capabilities: { manage_options: wpUser.roles.includes('administrator') }
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  const login = async () => {
    window.location.href = '/wp-login.php?redirect_to=' + encodeURIComponent(window.location.href);
  };

  const logout = () => {
    window.location.href = '/wp-login.php?action=logout';
  };

  const refreshAuth = async () => {
    await fetchAuth();
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.roles.includes('administrator') ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        refreshAuth,
      }}
    >
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