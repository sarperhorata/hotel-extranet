import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Tenant, LoginForm, RegisterForm, AuthContextType } from '../types';
import { authService } from '../services/auth.service';
import { toast } from 'react-toastify';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (token && refreshToken) {
          const userData = await authService.getCurrentUser();
          if (userData) {
            setUser(userData.user);
            setTenant(userData.tenant);
          } else {
            // Token might be expired, try to refresh
            try {
              const refreshed = await authService.refreshToken();
              if (refreshed) {
                const userData = await authService.getCurrentUser();
                if (userData) {
                  setUser(userData.user);
                  setTenant(userData.tenant);
                }
              }
            } catch (error) {
              // Refresh failed, clear tokens
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginForm) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      setUser(response.user);
      setTenant(response.tenant);

      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterForm) => {
    try {
      setLoading(true);
      const response = await authService.register(data);

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      setUser(response.user);
      setTenant(response.tenant);

      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setTenant(null);
    toast.info('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    tenant,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
