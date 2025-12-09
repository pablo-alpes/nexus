'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import UserContextBar from '@/components/UserContextBar';
import DashboardNav from '@/components/DashboardNav';

interface Organization {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface Affiliate {
  _id: string;
  affiliateId: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  affiliateId?: string;
  permissions?: {
    canAccessRuleEngine?: boolean;
    canValidateEvidence?: boolean;
  };
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [allAffiliates, setAllAffiliates] = useState<Affiliate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'organizations' | 'affiliates' | 'users'>('organizations');
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('all');
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string>('all');
  const [userRole, setUserRole] = useState<string>('USER');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (allAffiliates.length > 0) {
      filterAffiliates(allAffiliates, selectedOrganizationId, selectedAffiliateId);
    }
  }, [selectedOrganizationId, selectedAffiliateId, allAffiliates]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, affiliatesRes, userRes] = await Promise.all([
        apiRequest<{ organizations: Organization[] }>('/organizations'),
        apiRequest<{ affiliates: Affiliate[] }>('/affiliates'),
        apiRequest<{ user: User }>('/auth/me').catch(() => ({ user: null })),
      ]);
      setOrganizations(orgsRes.organizations || []);
      setAllAffiliates(affiliatesRes.affiliates || []);
      
      // Get user role and set filters
      if (userRes?.user) {
        const role = userRes.user.role || 'USER';
        console.log('User role loaded:', role, userRes.user);
        setUserRole(role);
        setCurrentUser(userRes.user);
        
        // For non-SuperAdmin users, filter to their affiliate only
        if (role !== 'SUPER_ADMIN' && userRes.user.affiliateId) {
          setSelectedAffiliateId(String(userRes.user.affiliateId));
        }
      } else {
        console.warn('No user data received from /auth/me', userRes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAffiliates = (allAffs: Affiliate[], orgId: string, affId: string) => {
    let filtered = allAffs;
    
    // Filter by organization
    if (orgId && orgId !== 'all') {
      filtered = filtered.filter(aff => String(aff.organizationId) === String(orgId));
    }
    
    // Filter by affiliate
    if (affId && affId !== 'all') {
      filtered = filtered.filter(aff => String(aff._id) === String(affId));
    }
    
    setAffiliates(filtered);
  };

  const handleCreateOrganization = async () => {
    try {
      await apiRequest('/organizations', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowOrgModal(false);
      setFormData({});
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCreateAffiliate = async () => {
    try {
      const response = await apiRequest<{ affiliate: Affiliate }>('/affiliates', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      });
      
      // Show success message with the created affiliate ID
      if (response.affiliate) {
        alert(`Affiliate created successfully!\n\nAffiliate ID: ${response.affiliate.affiliateId}\nName: ${response.affiliate.name}\nOrganization ID: ${response.affiliate.organizationId}`);
      }
      
      setShowAffiliateModal(false);
      setFormData({});
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={currentUser || undefined} />

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('organizations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'organizations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Organizations
              </button>
              <button
                onClick={() => setActiveTab('affiliates')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'affiliates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Affiliates
              </button>
            </nav>
          </div>
        </div>

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Organizations</h2>
              <div className="flex items-center space-x-4">
                {/* Debug: Show current role */}
                <span className="text-xs text-gray-500">Role: {userRole || 'Loading...'}</span>
                <button
                  onClick={() => {
                    if (userRole === 'SUPER_ADMIN') {
                      setShowOrgModal(true);
                    } else {
                      alert('Only SuperAdmin can create organizations. Your current role: ' + (userRole || 'Unknown'));
                    }
                  }}
                  className={`px-4 py-2 rounded-md ${
                    userRole === 'SUPER_ADMIN'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={userRole !== 'SUPER_ADMIN' ? 'Only SuperAdmin can create organizations' : 'Create a new organization'}
                >
                  + Create Organization
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizations.map((org) => (
                    <tr key={org._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {org.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {org.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Affiliates Tab */}
        {activeTab === 'affiliates' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Affiliates</h2>
              <div className="flex items-center space-x-4">
                {/* Filter dropdowns for SuperAdmin */}
                {userRole === 'SUPER_ADMIN' && (
                  <>
                    <select
                      value={selectedOrganizationId}
                      onChange={(e) => {
                        setSelectedOrganizationId(e.target.value);
                        setSelectedAffiliateId('all'); // Reset affiliate filter when org changes
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Organizations</option>
                      {organizations.map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedAffiliateId}
                      onChange={(e) => setSelectedAffiliateId(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      disabled={selectedOrganizationId === 'all'}
                    >
                      <option value="all">All Affiliates</option>
                      {allAffiliates
                        .filter(aff => selectedOrganizationId === 'all' || String(aff.organizationId) === String(selectedOrganizationId))
                        .map((aff) => (
                          <option key={aff._id} value={aff._id}>
                            {aff.name} ({aff.affiliateId})
                          </option>
                        ))}
                    </select>
                  </>
                )}
                <button
                  onClick={() => {
                    if (userRole === 'SUPER_ADMIN') {
                      setShowAffiliateModal(true);
                    } else {
                      alert('Only SuperAdmin can create affiliates. Your current role: ' + (userRole || 'Unknown'));
                    }
                  }}
                  className={`px-4 py-2 rounded-md ${
                    userRole === 'SUPER_ADMIN'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={userRole !== 'SUPER_ADMIN' ? 'Only SuperAdmin can create affiliates' : 'Create a new affiliate'}
                >
                  + Create Affiliate
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affiliates.map((affiliate) => (
                    <tr key={affiliate._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {affiliate.affiliateId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {affiliate.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {affiliate.description || '-'}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {organizations.find(org => String(org._id) === String(affiliate.organizationId))?.name || affiliate.organizationId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Organization Modal */}
        {showOrgModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Create Organization</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowOrgModal(false);
                      setFormData({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOrganization}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Affiliate Modal */}
        {showAffiliateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Create Affiliate</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The affiliate will be automatically linked to your organization. 
                    An affiliate ID will be generated automatically upon creation.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAffiliateModal(false);
                      setFormData({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAffiliate}
                    disabled={!formData.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

