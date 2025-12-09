/**
 * Hook to get API parameters based on ViewContext and user role
 */

import { useViewContext } from '@/contexts/ViewContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/api';

export function useApiParams() {
  const { selectedOrganizationId, selectedAffiliateId } = useViewContext();
  const [user, setUser] = useState<any>(null);
  const [legalFramework, setLegalFramework] = useState<string>('DORA');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userRes = await apiRequest<{ user: any }>('/auth/me');
        if (userRes?.user) {
          setUser(userRes.user);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Build query parameters based on user role and view context
  // Memoize to prevent unnecessary recalculations
  const getApiParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    
    // For SuperAdmin: use selected view context
    if (user?.role === 'SUPER_ADMIN') {
      if (selectedOrganizationId && selectedOrganizationId !== 'all') {
        params.append('organizationId', selectedOrganizationId);
      }
      if (selectedAffiliateId && selectedAffiliateId !== 'all') {
        params.append('affiliateId', selectedAffiliateId);
      }
    }
    
    // Add legal framework (can be extended in the future)
    if (legalFramework && legalFramework !== 'all') {
      params.append('legalFramework', legalFramework);
    }
    
    return params;
  }, [user?.role, selectedOrganizationId, selectedAffiliateId, legalFramework]);

  // Memoize getApiUrl to prevent it from changing on every render
  const getApiUrl = useCallback((endpoint: string): string => {
    const params = getApiParams();
    const queryString = params.toString();
    return `${endpoint}${queryString ? `?${queryString}` : ''}`;
  }, [getApiParams]);

  // Memoize computed values
  const organizationId = useMemo(() => {
    return user?.role === 'SUPER_ADMIN' ? selectedOrganizationId : user?.organizationId;
  }, [user?.role, selectedOrganizationId, user?.organizationId]);

  const affiliateId = useMemo(() => {
    return user?.role === 'SUPER_ADMIN' ? selectedAffiliateId : user?.affiliateId;
  }, [user?.role, selectedAffiliateId, user?.affiliateId]);

  return {
    getApiParams,
    getApiUrl,
    organizationId,
    affiliateId,
    legalFramework,
    setLegalFramework,
    userRole: user?.role,
  };
}

