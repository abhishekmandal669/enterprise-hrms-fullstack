import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  officialEmail?: string;
  role: 'ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  designation: string;
  department: string;
  reportingManager?: string | null;
  avatarUrl?: string;
  shiftStartTime: string;
  shiftEndTime: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  isLoading: boolean;
  can: (permissionKey: string) => boolean;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string; require2FA?: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, code: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (fields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const getStoredToken = () =>
    localStorage.getItem('nexus_token') ||
    sessionStorage.getItem('nexus_token') ||
    localStorage.getItem('lexvera_token');
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial Fetch on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = getStoredToken();
        if (savedToken) {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            setPermissions(res.data.permissions || []);
            setToken(savedToken);
          } else {
            localStorage.removeItem('nexus_token');
            sessionStorage.removeItem('nexus_token');
            localStorage.removeItem('lexvera_token');
            setUser(null);
            setToken(null);
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        localStorage.removeItem('nexus_token');
        sessionStorage.removeItem('nexus_token');
        localStorage.removeItem('lexvera_token');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleSessionExpired = () => {
      localStorage.removeItem('nexus_token');
      sessionStorage.removeItem('nexus_token');
      localStorage.removeItem('lexvera_token');
      localStorage.removeItem('nexus_refresh_token');
      sessionStorage.removeItem('nexus_refresh_token');
      localStorage.removeItem('lexvera_refresh_token');
      setUser(null);
      setToken(null);
      setPermissions([]);
    };

    window.addEventListener('nexus:session_expired', handleSessionExpired);
    window.addEventListener('lexvera:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('nexus:session_expired', handleSessionExpired);
      window.removeEventListener('lexvera:session_expired', handleSessionExpired);
    };
  }, []);

  const can = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return permissions.includes(permissionKey);
  };

  const login = async (identifier: string, pass: string, rememberMe: boolean = true) => {
    try {
      const res = await api.post('/auth/login', {
        email: identifier,
        password: pass
      });

      if (res.data.success) {
        if (res.data.require2FA) {
          return {
            success: true,
            require2FA: true,
            tempToken: res.data.tempToken,
            message: res.data.message
          };
        }

        const accToken = res.data.token || res.data.accessToken;
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('nexus_token', accToken);
        if (res.data.refreshToken) {
          storage.setItem('nexus_refresh_token', res.data.refreshToken);
        }
        setToken(accToken);
        setUser(res.data.user);
        setPermissions(res.data.permissions || []);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Invalid credentials or server error.'
      };
    }
  };

  const verify2FA = async (tempToken: string, code: string, rememberMe: boolean = true) => {
    try {
      const res = await api.post('/auth/verify-2fa', { tempToken, code });
      if (res.data.success) {
        const accToken = res.data.token || res.data.accessToken;
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('nexus_token', accToken);
        if (res.data.refreshToken) {
          storage.setItem('nexus_refresh_token', res.data.refreshToken);
        }
        setToken(accToken);
        setUser(res.data.user);
        setPermissions(res.data.permissions || []);
        return { success: true };
      }
      return { success: false, message: res.data.message || '2FA verification failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Invalid or expired 2FA code.'
      };
    }
  };

  const logout = async () => {
    const refreshToken =
      localStorage.getItem('nexus_refresh_token') ||
      sessionStorage.getItem('nexus_refresh_token') ||
      localStorage.getItem('lexvera_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (_) {}
    localStorage.removeItem('nexus_token');
    sessionStorage.removeItem('nexus_token');
    localStorage.removeItem('lexvera_token');
    localStorage.removeItem('nexus_refresh_token');
    sessionStorage.removeItem('nexus_refresh_token');
    localStorage.removeItem('lexvera_refresh_token');
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const updateUser = (fields: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...fields } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isLoading,
        can,
        login,
        verify2FA,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
