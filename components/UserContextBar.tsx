'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface UserContextBarProps {
  className?: string;
}

export default function UserContextBar({ className = '' }: UserContextBarProps) {
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user
        const userRes = await apiRequest<{ user: any }>('/auth/me');
        if (userRes?.user) {
          setUser(userRes.user);
        }

        // Load organizations and affiliates
        const orgsRes = await apiRequest<{ organizations: any[] }>('/organizations');
        if (orgsRes?.organizations) {
          setOrganizations(orgsRes.organizations);
        }

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

  if (loading || !user) {
    return null;
  }

  const userOrg = organizations.find(org => String(org._id) === String(user.organizationId));
  const userAffiliate = user.affiliateId 
    ? affiliates.find(aff => String(aff._id) === String(user.affiliateId))
    : null;

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
            
            {userOrg && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">🏢</span>
                  <span className="text-gray-700">{userOrg.name}</span>
                </div>
              </>
            )}
            
            {userAffiliate && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">🏛️</span>
                  <span className="text-gray-700">{userAffiliate.name}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

