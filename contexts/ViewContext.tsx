'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ViewContextType {
  selectedOrganizationId: string | null;
  selectedAffiliateId: string | null;
  setSelectedOrganization: (orgId: string | null) => void;
  setSelectedAffiliate: (affId: string | null) => void;
  clearSelection: () => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedOrgId = localStorage.getItem('viewOrganizationId');
    const storedAffId = localStorage.getItem('viewAffiliateId');
    
    if (storedOrgId && storedOrgId !== 'null') {
      setSelectedOrganizationId(storedOrgId);
    }
    if (storedAffId && storedAffId !== 'null') {
      setSelectedAffiliateId(storedAffId);
    }
  }, []);

  const setSelectedOrganization = (orgId: string | null) => {
    setSelectedOrganizationId(orgId);
    if (orgId) {
      localStorage.setItem('viewOrganizationId', orgId);
    } else {
      localStorage.removeItem('viewOrganizationId');
    }
    // Clear affiliate when organization changes
    if (orgId !== selectedOrganizationId) {
      setSelectedAffiliateId(null);
      localStorage.removeItem('viewAffiliateId');
    }
  };

  const setSelectedAffiliate = (affId: string | null) => {
    setSelectedAffiliateId(affId);
    if (affId) {
      localStorage.setItem('viewAffiliateId', affId);
    } else {
      localStorage.removeItem('viewAffiliateId');
    }
  };

  const clearSelection = () => {
    setSelectedOrganizationId(null);
    setSelectedAffiliateId(null);
    localStorage.removeItem('viewOrganizationId');
    localStorage.removeItem('viewAffiliateId');
  };

  return (
    <ViewContext.Provider
      value={{
        selectedOrganizationId,
        selectedAffiliateId,
        setSelectedOrganization,
        setSelectedAffiliate,
        clearSelection,
      }}
    >
      {children}
    </ViewContext.Provider>
  );
}

export function useViewContext() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useViewContext must be used within a ViewProvider');
  }
  return context;
}

