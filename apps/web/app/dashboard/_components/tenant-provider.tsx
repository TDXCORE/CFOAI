'use client';

import { createContext, useContext } from 'react';
import type { AuthContext } from '~/lib/auth/server';

const TenantContext = createContext<AuthContext | null>(null);

interface TenantProviderProps {
  value: AuthContext;
  children: React.ReactNode;
}

export function TenantProvider({ value, children }: TenantProviderProps) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  
  return context;
}