import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, TenantContextType } from '../types';
import { useAuth } from './AuthContext';
import { tenantService } from '../services/tenant.service';
import { toast } from 'react-toastify';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { tenant: authTenant } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (authTenant) {
      setCurrentTenant(authTenant);
    }
  }, [authTenant]);

  const switchTenant = async (tenantId: string) => {
    try {
      const tenant = await tenantService.getTenant(tenantId);
      setCurrentTenant(tenant);
      toast.success(`Switched to ${tenant.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch tenant');
      throw error;
    }
  };

  const value: TenantContextType = {
    currentTenant,
    switchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
