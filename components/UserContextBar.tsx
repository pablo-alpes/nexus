'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useViewContext } from '@/contexts/ViewContext';

interface UserContextBarProps {
  className?: string;
}

export default function UserContextBar({ className = '' }: UserContextBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedOrganizationId, selectedAffiliateId } = useViewContext();
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrganization, setViewOrganization] = useState<any>(null);
  const [viewAffiliate, setViewAffiliate] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user first
        const userRes = await apiRequest<{ user: any }>('/auth/me');
        if (!userRes?.user) {
          setLoading(false);
          return;
        }
        
        const currentUser = userRes.user;
        setUser(currentUser);

        // Load organizations
        const orgsRes = await apiRequest<{ organizations: any[] }>('/organizations');
        if (orgsRes?.organizations) {
          setOrganizations(orgsRes.organizations);
        }

        // Load affiliates - the API should return the user's affiliate if they have one
        const affsRes = await apiRequest<{ affiliates: any[] }>('/affiliates');
        if (affsRes?.affiliates) {
          setAffiliates(affsRes.affiliates);
        }
      } catch (error) {
        console.error('Failed to load user context:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // For SuperAdmin: Load view organization and affiliate from ViewContext
  useEffect(() => {
    const loadViewContext = async () => {
      if (!user || user.role !== 'SUPER_ADMIN') {
        setViewOrganization(null);
        setViewAffiliate(null);
        return;
      }

      console.log('🔄 UserContextBar: Loading view context', { 
        selectedOrganizationId, 
        selectedAffiliateId,
        orgsCount: organizations.length,
        affsCount: affiliates.length
      });

      if (selectedOrganizationId && selectedOrganizationId !== 'all' && selectedOrganizationId !== 'null') {
        // Find organization in already loaded list
        let org = organizations.find(o => String(o._id) === selectedOrganizationId);
        
        // If not found, try to fetch it
        if (!org) {
          try {
            const orgRes = await apiRequest<{ organization: any }>(`/organizations/${selectedOrganizationId}`);
            if (orgRes?.organization) {
              org = orgRes.organization;
              // Add to organizations list
              if (!organizations.find(o => String(o._id) === String(org._id))) {
                setOrganizations(prev => [...prev, org]);
              }
            }
          } catch (error) {
            console.warn('Could not fetch organization:', error);
          }
        }
        console.log('✅ UserContextBar: Setting view organization', org?.name);
        setViewOrganization(org || null);
      } else {
        console.log('ℹ️ UserContextBar: No organization selected');
        setViewOrganization(null);
      }

      if (selectedAffiliateId && selectedAffiliateId !== 'all' && selectedAffiliateId !== 'null') {
        // First try to find in already loaded affiliates
        let aff = affiliates.find(a => String(a._id) === selectedAffiliateId);
        
        // If not found and we have orgId, try to fetch all affiliates for that organization
        if (!aff && selectedOrganizationId && selectedOrganizationId !== 'all' && selectedOrganizationId !== 'null') {
          try {
            const allAffsRes = await apiRequest<{ affiliates: any[] }>(`/affiliates?organizationId=${selectedOrganizationId}`);
            if (allAffsRes?.affiliates) {
              aff = allAffsRes.affiliates.find(a => String(a._id) === selectedAffiliateId);
              // Update affiliates list (avoid duplicates)
              setAffiliates(prev => {
                const existingIds = new Set(prev.map(a => String(a._id)));
                const newAffs = allAffsRes.affiliates.filter(a => !existingIds.has(String(a._id)));
                return [...prev, ...newAffs];
              });
            }
          } catch (error) {
            console.warn('Could not fetch affiliate:', error);
          }
        }
        
        console.log('✅ UserContextBar: Setting view affiliate', aff?.name);
        setViewAffiliate(aff || null);
      } else {
        console.log('ℹ️ UserContextBar: No affiliate selected');
        setViewAffiliate(null);
      }
    };

    if (user) {
      loadViewContext();
    }
  }, [user, selectedOrganizationId, selectedAffiliateId]);

  if (loading || !user) {
    return null;
  }

  // For SuperAdmin: use view context if available, otherwise use user's context
  // For other users: always use their assigned organization and affiliate
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Determine which organization and affiliate to display
  // SuperAdmin: show selected view context (if any), otherwise their assigned org/affiliate
  // Other users: always show their assigned org/affiliate
  const displayOrg = isSuperAdmin && viewOrganization 
    ? viewOrganization 
    : organizations.find(org => String(org._id) === String(user.organizationId));
  
  let displayAffiliate = null;
  if (isSuperAdmin && viewAffiliate) {
    displayAffiliate = viewAffiliate;
  } else if (user.affiliateId) {
    // Find the user's assigned affiliate - try multiple matching strategies
    const userAffiliateIdStr = String(user.affiliateId);
    
    // First try: match by _id (most common case)
    displayAffiliate = affiliates.find(aff => String(aff._id) === userAffiliateIdStr);
    
    // Second try: match by affiliateId field (if _id doesn't match)
    if (!displayAffiliate) {
      displayAffiliate = affiliates.find(aff => String(aff.affiliateId) === userAffiliateIdStr);
    }
    
    // Third try: match by comparing ObjectId strings more flexibly
    if (!displayAffiliate) {
      displayAffiliate = affiliates.find(aff => {
        const affId = String(aff._id);
        const affIdClean = affId.replace(/['"]/g, '');
        const userIdClean = userAffiliateIdStr.replace(/['"]/g, '');
        return affIdClean === userIdClean || affId === userIdClean || affIdClean === userAffiliateIdStr;
      });
    }
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  return (
    <div className={`bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 py-2 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">👤</span>
              <span className="font-medium text-gray-700">{user.name || user.email}</span>
              {user.role && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {user.role}
                </span>
              )}
            </div>
            
            {displayOrg && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">🏢</span>
                  <span 
                    className="text-gray-700" 
                    title={`Organization ID: ${displayOrg._id}${isSuperAdmin && viewOrganization ? ' (viewing)' : ''}`}
                  >
                    {displayOrg.name}
                    {isSuperAdmin && viewOrganization && (
                      <span className="ml-1 text-xs text-blue-600">(viewing)</span>
                    )}
                  </span>
                </div>
              </>
            )}
            
            {displayAffiliate && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">🏛️</span>
                  <span 
                    className="text-gray-700" 
                    title={`Affiliate ID: ${displayAffiliate.affiliateId || displayAffiliate._id}${isSuperAdmin && viewAffiliate ? ' (viewing)' : ''}`}
                  >
                    {displayAffiliate.name}
                    {isSuperAdmin && viewAffiliate && (
                      <span className="ml-1 text-xs text-blue-600">(viewing)</span>
                    )}
                  </span>
                </div>
              </>
            )}
            {!displayAffiliate && user.affiliateId && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">🏛️</span>
                  <span className="text-gray-500 italic" title={`Full ID: ${String(user.affiliateId)}`}>
                    Affiliate: {String(user.affiliateId).substring(0, 12)}...
                  </span>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-1.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Logout"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

