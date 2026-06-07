import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthResponse, AuthUser, SignupPayload } from './api';
import { fetchMe, login, signup as apiSignup } from './api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  loginWithPassword: (username: string, password: string) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const handleRefresh = (e: any) => {
      setAccessToken(e.detail.access);
    };
    window.addEventListener('token-refreshed', handleRefresh);
    return () => window.removeEventListener('token-refreshed', handleRefresh);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setInitialized(true);
      return;
    }
    fetchMe(accessToken)
      .then((me) => {
        setUser({
          id: me.id,
          username: me.username,
          email: me.email,
          first_name: me.first_name,
          last_name: me.last_name,
          role: me.role as AuthUser['role'],
        });
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => {
        setInitialized(true);
      });
  }, [accessToken]);

  const loginWithPassword = async (username: string, password: string) => {
    const data: AuthResponse = await login(username, password);
    setAccessToken(data.access);
    setUser(data.user);
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    return data.user;
  };
  
  const signup = async (payload: SignupPayload) => {
    const data: AuthResponse = await apiSignup(payload);
    setAccessToken(data.access);
    setUser(data.user);
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        initialized,
        loginWithPassword,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

