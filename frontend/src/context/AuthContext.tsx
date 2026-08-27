import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AgentStatus } from '../types';
import { apiClient } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  updateAgentStatus: (status: AgentStatus) => Promise<void>;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAgent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
          } else {
            logoutLocal();
          }
        } catch (err) {
          logoutLocal();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logoutLocal = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (err) {
      // Ignored
    } finally {
      logoutLocal();
      window.location.href = '/login';
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updated };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
    }
  };

  const updateAgentStatus = async (status: AgentStatus) => {
    if (!user || user.role !== 'AGENT') return;
    try {
      const res = await apiClient.put(`/agents/${user.id}/status`, { status });
      if (res.data.success && user.agentProfile) {
        updateUser({
          agentProfile: {
            ...user.agentProfile,
            status,
          },
        });
      }
    } catch (err) {
      console.error('Failed to update agent status', err);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR' || isAdmin;
  const isAgent = user?.role === 'AGENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        updateAgentStatus,
        isAdmin,
        isSupervisor,
        isAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
