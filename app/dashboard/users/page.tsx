'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import UserContextBar from '@/components/UserContextBar';

interface User {
  _id: string;
  email: string;
  name: string;
  company?: string;
  role: string;
  organizationId?: string;
  affiliateId?: string;
  permissions?: {
    canAccessRuleEngine?: boolean;
    canValidateEvidence?: boolean;
    canEditRuleEngine?: boolean;
    canUploadEvidence?: boolean;
    canManageRoadmap?: boolean;
    isOrganizationAdmin?: boolean;
  };
  createdAt: string;
}

interface Organization {
  _id: string;
  name: string;
}

interface Affiliate {
  _id: string;
  affiliateId: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filterAffiliateId, setFilterAffiliateId] = useState<string>('all');
  const [filterOrganizationId, setFilterOrganizationId] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filterAffiliateId, filterOrganizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes, affiliatesRes, currentUserRes] = await Promise.all([
        apiRequest<{ users: User[] }>(`/users?affiliateId=${filterAffiliateId}&organizationId=${filterOrganizationId}`),
        apiRequest<{ organizations: Organization[] }>('/organizations'),
        apiRequest<{ affiliates: Affiliate[] }>('/affiliates'),
        apiRequest<{ user: User }>('/auth/me').catch(() => ({ user: null })),
      ]);
      setUsers(usersRes.users || []);
      setOrganizations(orgsRes.organizations || []);
      setAffiliates(affiliatesRes.affiliates || []);
      if (currentUserRes?.user) {
        setCurrentUser(currentUserRes.user);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      role: user.role,
      permissions: { ...user.permissions },
      affiliateId: user.affiliateId || '',
      organizationId: user.organizationId || '',
      name: user.name,
      company: user.company || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      if (selectedUser) {
        // Update existing user
        await apiRequest('/users', {
          method: 'PUT',
          body: JSON.stringify({
            userId: selectedUser._id,
            ...formData,
          }),
        });
      } else {
        // Create new user
        if (!formData.email || !formData.password) {
          alert('Email and password are required to create a user');
          return;
        }
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            email: formData.email,
            password: formData.password,
          }),
        });
      }
      setShowEditModal(false);
      setShowCreateModal(false);
      setSelectedUser(null);
      setFormData({});
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await apiRequest(`/users?userId=${userId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCreateMockAssets = async (userId: string, userName: string) => {
    if (!confirm(`Create mock assets for ${userName}? This will create 15 sample assets.`)) {
      return;
    }
    try {
      const response = await apiRequest<{ message: string; created: number; errors: number }>('/assets/mock', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      alert(`✅ ${response.message}\nCreated: ${response.created} assets\nErrors: ${response.errors}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const canManageUsers = () => {
    if (!currentUser) return false;
    return currentUser.role === 'SUPER_ADMIN' || currentUser.permissions?.isOrganizationAdmin;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      case 'USER':
        return 'User';
      default:
        return role;
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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        {currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.permissions?.isOrganizationAdmin) && (
          <div className="mb-6 flex space-x-4">
            <select
              value={filterOrganizationId}
              onChange={(e) => {
                setFilterOrganizationId(e.target.value);
                setFilterAffiliateId('all');
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
              value={filterAffiliateId}
              onChange={(e) => setFilterAffiliateId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={filterOrganizationId === 'all'}
            >
              <option value="all">All Affiliates</option>
              {affiliates
                .filter(aff => filterOrganizationId === 'all' || String(aff.organizationId) === String(filterOrganizationId))
                .map((aff) => (
                  <option key={aff._id} value={aff._id}>
                    {aff.name} ({aff.affiliateId})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Users</h2>
            {canManageUsers() && (
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setFormData({
                    role: 'USER',
                    permissions: {},
                    affiliateId: '',
                    organizationId: '',
                    name: '',
                    company: '',
                  });
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Create User
              </button>
            )}
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name / Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {organizations.find(org => String(org._id) === String(user.organizationId))?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {affiliates.find(aff => String(aff._id) === String(user.affiliateId))?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions?.isOrganizationAdmin && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Org Admin</span>
                      )}
                      {user.permissions?.canEditRuleEngine && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Rule Editor</span>
                      )}
                      {user.permissions?.canUploadEvidence && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Evidence Upload</span>
                      )}
                      {user.permissions?.canManageRoadmap && (
                        <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">Roadmap Mgr</span>
                      )}
                      {user.permissions?.canAccessRuleEngine && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Rule Engine</span>
                      )}
                      {user.permissions?.canValidateEvidence && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Validate</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {canManageUsers() && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleCreateMockAssets(user._id, user.name)}
                            className="text-green-600 hover:text-green-900"
                            title="Create mock assets for this user"
                          >
                            📦 Mock Assets
                          </button>
                        )}
                        {user._id !== currentUser?._id && (
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>

        {/* Edit/Create Modal */}
        {(showEditModal || showCreateModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {selectedUser ? 'Edit User' : 'Create User'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
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
                    Email {!selectedUser && '*'}
                  </label>
                  <input
                    type="email"
                    value={selectedUser?.email || formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!selectedUser}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${selectedUser ? 'bg-gray-50' : ''}`}
                    required={!selectedUser}
                  />
                </div>

                {!selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role || 'USER'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={currentUser?.role !== 'SUPER_ADMIN'}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <option value="SUPER_ADMIN">Super Admin</option>
                    )}
                  </select>
                </div>

                {currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.permissions?.isOrganizationAdmin) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization
                      </label>
                      <select
                        value={formData.organizationId || ''}
                        onChange={(e) => setFormData({ ...formData, organizationId: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">None</option>
                        {organizations.map((org) => (
                          <option key={org._id} value={org._id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Affiliate
                      </label>
                      <select
                        value={formData.affiliateId || ''}
                        onChange={(e) => setFormData({ ...formData, affiliateId: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">None</option>
                        {affiliates
                          .filter(aff => !formData.organizationId || String(aff.organizationId) === String(formData.organizationId))
                          .map((aff) => (
                            <option key={aff._id} value={aff._id}>
                              {aff.name} ({aff.affiliateId})
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.isOrganizationAdmin || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            isOrganizationAdmin: e.target.checked,
                          },
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Organization Admin</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.canEditRuleEngine || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            canEditRuleEngine: e.target.checked,
                          },
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Rule Engine Editor</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.canUploadEvidence !== false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            canUploadEvidence: e.target.checked,
                          },
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Can Upload Evidence</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.canManageRoadmap || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            canManageRoadmap: e.target.checked,
                          },
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Roadmap Manager</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.canAccessRuleEngine || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            canAccessRuleEngine: e.target.checked,
                          },
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Access Rule Engine (View)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions?.canValidateEvidence || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            canValidateEvidence: e.target.checked,
                          },
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">Validate Evidence</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setShowCreateModal(false);
                    setSelectedUser(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

