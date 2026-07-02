"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../hooks/useApi';

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  organizations: any[];
  activeOrganization: any | null;
  switchOrganization: (orgId: string) => void;
  logoutUser: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<any | null>(null);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        const orgs = res.data.organizations || [];
        setOrganizations(orgs);
        
        let activeOrg = null;
        const savedTenantId = localStorage.getItem('tenantId');
        if (savedTenantId && orgs.some((o: any) => o.id === savedTenantId)) {
          activeOrg = orgs.find((o: any) => o.id === savedTenantId);
        } else if (orgs.length > 0) {
          activeOrg = orgs[0];
          localStorage.setItem('tenantId', activeOrg.id);
        }
        setActiveOrganization(activeOrg);
      } catch (err) {
        logoutUser();
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      const urlTenantId = params.get('tenantId');
      if (urlToken) {
        localStorage.setItem('token', urlToken);
      }
      if (urlTenantId) {
        localStorage.setItem('tenantId', urlTenantId);
      }
    }
    refreshUser();
  }, []);

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrganization(null);
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      localStorage.setItem('tenantId', org.id);
      setActiveOrganization(org);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      organizations, 
      activeOrganization, 
      switchOrganization, 
      logoutUser,
      refreshUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};