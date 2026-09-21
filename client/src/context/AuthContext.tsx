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
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lexvera_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial Fetch on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('lexvera_token');
        if (savedToken) {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            setPermissions(res.data.permissions || []);
            setToken(savedToken);
          } else {
            localStorage.removeItem('lexvera_token');
            setUser(null);
            setToken(null);
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        localStorage.removeItem('lexvera_token');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleSessionExpired = () => {
      localStorage.removeItem('lexvera_token');
      setUser(null);
      setToken(null);
      setPermissions([]);
    };

    window.addEventListener('lexvera:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('lexvera:session_expired', handleSessionExpired);
    };
  }, []);

  const can = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return permissions.includes(permissionKey);
  };

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await api.post('/auth/login', {
        email: identifier,
        password: pass
      });

      if (res.data.success) {
        localStorage.setItem('lexvera_token', res.data.token || res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('lexvera_refresh_token', res.data.refreshToken);
        }
        setToken(res.data.token || res.data.accessToken);
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

  const logout = async () => {
    const refreshToken = localStorage.getItem('lexvera_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (_) {}
    localStorage.removeItem('lexvera_token');
    localStorage.removeItem('lexvera_refresh_token');
    setToken(null);
    setUser(null);
    setPermissions([]);
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
        logout
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
