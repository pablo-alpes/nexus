'use client';

/**
 * Tenant view context — selected cabinet / client for Chile Privacy SaaS.
 * Persists selection in localStorage for API query params.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface TenantViewState {
  cabinetId: string | null;
  clientId: string | null;
  role: string | null;
  setCabinetId: (id: string | null) => void;
  setClientId: (id: string | null) => void;
  apiQuery: string; // e.g. "?cabinetId=x&clientId=y"
}

const TenantViewContext = createContext<TenantViewState | null>(null);

export function TenantViewProvider({ children }: { children: React.ReactNode }) {
  const [cabinetId, setCabinetIdState] = useState<string | null>(null);
  const [clientId, setClientIdState] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCabinetIdState(localStorage.getItem('cabinetId'));
    setClientIdState(localStorage.getItem('clientId'));
    setRole(localStorage.getItem('role'));
  }, []);

  const setCabinetId = useCallback((id: string | null) => {
    setCabinetIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('cabinetId', id);
      else localStorage.removeItem('cabinetId');
    }
  }, []);

  const setClientId = useCallback((id: string | null) => {
    setClientIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('clientId', id);
      else localStorage.removeItem('clientId');
    }
  }, []);

  const params = new URLSearchParams();
  if (cabinetId) params.set('cabinetId', cabinetId);
  if (clientId) params.set('clientId', clientId);
  const qs = params.toString();
  const apiQuery = qs ? `?${qs}` : '';

  return (
    <TenantViewContext.Provider
      value={{ cabinetId, clientId, role, setCabinetId, setClientId, apiQuery }}
    >
      {children}
    </TenantViewContext.Provider>
  );
}

export function useTenantView(): TenantViewState {
  const ctx = useContext(TenantViewContext);
  if (!ctx) {
    return {
      cabinetId: null,
      clientId: null,
      role: null,
      setCabinetId: () => {},
      setClientId: () => {},
      apiQuery: '',
    };
  }
  return ctx;
}
