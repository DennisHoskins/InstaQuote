import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/apiClient';

interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  capabilities: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  nonce: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const baseUrl = 'http://localhost:3001/api/auth/user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuth = async () => {
    try {
      const response = await fetch(baseUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch auth');
      }

      const data = await response.json();

      if (data.isAuthenticated) {
        setUser(data.user);
        setNonce(data.nonce);
        apiClient.setNonce(data.nonce); // Set nonce in API client
      } else {
        setUser(null);
        setNonce(null);
      }
    } catch (error) {
      console.error('Failed to fetch auth:', error);
      setUser(null);
      setNonce(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  const login = async () => {
    await fetchAuth();
  };

  const logout = () => {
    setUser(null);
    setNonce(null);
    apiClient.setNonce(''); // Clear nonce from API client
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
        nonce,
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