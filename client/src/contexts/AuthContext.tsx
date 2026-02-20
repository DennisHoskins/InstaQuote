import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchNonce, getNonce } from '../api/apiClient';

interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        await fetchNonce();
        const nonce = getNonce();

        const response = await fetch('/wp-json/instaquote/v1/me', {
          headers: nonce ? { 'X-WP-Nonce': nonce } : {},
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
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

    fetchUser();
  }, []);

  const login = () => {
    window.location.href = '/wp-login.php?redirect_to=' + encodeURIComponent(window.location.href);
  };

  const logout = () => {
    window.location.href = '/wp-login.php?action=logout';
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.roles.includes('administrator') ?? false;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, isAdmin, login, logout }}>
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