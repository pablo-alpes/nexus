'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import UserContextBar from '@/components/UserContextBar';
import DashboardNav from '@/components/DashboardNav';

const DORA_PILLARS = [
  { value: 'ICT_RISK_MANAGEMENT', label: 'ICT Risk Management', color: 'blue' },
  { value: 'INCIDENT_MANAGEMENT', label: 'Incident Management', color: 'red' },
  { value: 'RESILIENCE_TESTING', label: 'Resilience Testing', color: 'green' },
  { value: 'THIRD_PARTY_RISK', label: 'Third-Party Risk', color: 'yellow' },
  { value: 'INFORMATION_SHARING', label: 'Information Sharing', color: 'purple' },
];

interface PillarMetrics {
  pillar: string;
  totalRequirements: number;
  requirementsWithControls: number;
  totalControls: number;
  implementedControls: number;
  compliancePercentage: number;
  completenessPercentage: number;
  gaps: number;
  criticalGaps: number;
}

interface ComplianceOverview {
  organizationId?: string;
  organizationName?: string;
  affiliateId?: string;
  affiliateName?: string;
  overallCompliance: number;
  overallCompleteness: number;
  totalRequirements: number;
  requirementsWithControls: number;
  totalControls: number;
  implementedControls: number;
  totalUsers: number;
  pillarBreakdown: PillarMetrics[];
}

interface Organization {
  _id: string;
  name: string;
  description?: string;
}

interface Affiliate {
  _id: string;
  affiliateId: string;
  name: string;
  organizationId: string;
}

export default function ComplianceOverviewPage() {
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [filteredAffiliates, setFilteredAffiliates] = useState<Affiliate[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('all');
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'affiliates'>('overview');
  const [affiliatesOverview, setAffiliatesOverview] = useState<ComplianceOverview[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOrganizationId !== 'all') {
      const filtered = affiliates.filter(aff => String(aff.organizationId) === String(selectedOrganizationId));
      setFilteredAffiliates(filtered);
      if (selectedAffiliateId !== 'all' && !filtered.find(aff => String(aff._id) === selectedAffiliateId)) {
        setSelectedAffiliateId('all');
      }
    } else {
      setFilteredAffiliates(affiliates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganizationId, affiliates]);

  // Reload data when selection changes
  useEffect(() => {
    if (organizations.length > 0 && affiliates.length > 0) {
      if (activeTab === 'overview') {
        loadOverview();
      } else {
        loadAffiliatesOverview();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganizationId, selectedAffiliateId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, affiliatesRes, userRes] = await Promise.all([
        apiRequest<{ organizations: Organization[] }>('/organizations'),
        apiRequest<{ affiliates: Affiliate[] }>('/affiliates'),
        apiRequest<{ user: any }>('/auth/me').catch(() => ({ user: null })),
      ]);
      
      const orgs = orgsRes.organizations || [];
      const affs = affiliatesRes.affiliates || [];
      
      console.log('Organizations loaded:', orgs.length);
      console.log('Affiliates loaded:', affs.length);
      console.log('Organizations:', orgs.map(o => ({ id: o._id, name: o.name })));
      
      setOrganizations(orgs);
      setAffiliates(affs);
      setFilteredAffiliates(affs);
      
      if (userRes?.user) {
        setCurrentUser(userRes.user);
        // Don't auto-select organization for SuperAdmin - let them choose
        // if (userRes.user.role === 'SUPER_ADMIN' && userRes.user.organizationId) {
        //   setSelectedOrganizationId(String(userRes.user.organizationId));
        // }
      }
      
      await loadOverview();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrganizationId !== 'all') {
        params.append('organizationId', selectedOrganizationId);
      }
      if (selectedAffiliateId !== 'all') {
        params.append('affiliateId', selectedAffiliateId);
      }
      
      const response = await apiRequest<ComplianceOverview>(
        `/dashboard/compliance-overview?${params.toString()}`
      );
      setOverview(response);
    } catch (error) {
      console.error('Error loading compliance overview:', error);
      setOverview(null);
    }
  };

  const loadAffiliatesOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrganizationId !== 'all') {
        params.append('organizationId', selectedOrganizationId);
      }
      
      const response = await apiRequest<ComplianceOverview[]>(
        `/dashboard/affiliates-overview?${params.toString()}`
      );
      setAffiliatesOverview(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error loading affiliates overview:', error);
      setAffiliatesOverview([]);
    }
  };

  useEffect(() => {
    if (loading) return; // Don't load if already loading initial data
    
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'affiliates') {
      loadAffiliatesOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganizationId, selectedAffiliateId, activeTab]);

  const getPillarLabel = (pillar: string) => {
    return DORA_PILLARS.find(p => p.value === pillar)?.label || pillar;
  };

  const getPillarColor = (pillar: string) => {
    return DORA_PILLARS.find(p => p.value === pillar)?.color || 'gray';
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
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

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only SuperAdmin can access this page.</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={currentUser} />

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Selection Info - Always Visible */}
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Currently Viewing:</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Organization:</span>
                        <span className="text-sm font-bold text-blue-700">
                          {selectedOrganizationId === 'all' 
                            ? 'All Organizations' 
                            : organizations.find(org => String(org._id) === selectedOrganizationId)?.name || 'Loading...'}
                        </span>
                      </div>
                      {selectedOrganizationId !== 'all' && (
                        <>
                          <span className="text-gray-400">|</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Affiliate:</span>
                            <span className="text-sm font-bold text-indigo-700">
                              {selectedAffiliateId === 'all'
                                ? 'All Affiliates'
                                : affiliates.find(aff => String(aff._id) === selectedAffiliateId)?.name || 'Loading...'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {currentUser && (
              <div className="text-right border-l border-blue-200 pl-4">
                <p className="text-xs text-gray-500">Your Account</p>
                <p className="text-sm font-medium text-gray-700">
                  {organizations.find(org => String(org._id) === String(currentUser.organizationId))?.name || 'N/A'}
                </p>
                {currentUser.affiliateId && (
                  <p className="text-xs text-gray-600">
                    {affiliates.find(aff => String(aff._id) === String(currentUser.affiliateId))?.name || 'N/A'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white p-1 rounded-lg shadow">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Compliance Overview
            </button>
            <button
              onClick={() => setActiveTab('affiliates')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'affiliates'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Affiliates
            </button>
          </div>
        </div>

        {/* Filters - Simplified Single Dropdown */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Change View / Select Organization / Affiliate</h3>
            <span className="text-xs text-gray-500">Use dropdown below to change selection</span>
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Select what to view:
              </label>
              <select
                value={`${selectedOrganizationId}:${selectedAffiliateId}`}
                onChange={(e) => {
                  const [orgId, affId] = e.target.value.split(':');
                  console.log('Selection changed:', { orgId, affId });
                  setSelectedOrganizationId(orgId);
                  setSelectedAffiliateId(affId || 'all');
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-base font-medium"
                disabled={loading}
              >
                <option value="all:all">🌐 All Organizations & Affiliates</option>
                {organizations.map((org) => {
                  const orgId = String(org._id);
                  const orgAffiliates = affiliates.filter(aff => String(aff.organizationId) === orgId);
                  
                  return (
                    <optgroup key={orgId} label={`📁 ${org.name}`}>
                      <option value={`${orgId}:all`}>
                        └ All affiliates in {org.name}
                      </option>
                      {orgAffiliates.map((aff) => {
                        const affId = String(aff._id);
                        return (
                          <option key={affId} value={`${orgId}:${affId}`}>
                            └─ {aff.name} ({aff.affiliateId})
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
              {loading && (
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <span className="animate-spin mr-2">⏳</span> Loading...
                </p>
              )}
              {!loading && organizations.length === 0 && (
                <p className="text-xs text-red-500 mt-2">⚠️ No organizations found. Please create one first.</p>
              )}
              {!loading && organizations.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Select an organization to see its affiliates, or select a specific affiliate for detailed view
                </p>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'overview' && overview && (
          <>
            {/* Overall Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Compliance</h3>
                <div className={`text-3xl font-bold ${getComplianceColor(overview.overallCompliance)}`}>
                  {overview.overallCompliance}%
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {overview.implementedControls} / {overview.totalControls} controls
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Completeness</h3>
                <div className={`text-3xl font-bold ${getComplianceColor(overview.overallCompleteness)}`}>
                  {overview.overallCompleteness}%
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {overview.requirementsWithControls} / {overview.totalRequirements} requirements
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Requirements</h3>
                <div className="text-3xl font-bold text-gray-900">
                  {overview.totalRequirements}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {overview.requirementsWithControls} with controls
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
                <div className="text-3xl font-bold text-gray-900">
                  {overview.totalUsers}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {overview.organizationName || overview.affiliateName || 'All'}
                </p>
              </div>
            </div>

            {/* Pillar Breakdown */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Compliance by Pillar</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pillar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requirements
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completeness
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Controls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compliance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gaps
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overview.pillarBreakdown.map((pillar) => (
                      <tr key={pillar.pillar}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getPillarLabel(pillar.pillar)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {pillar.requirementsWithControls} / {pillar.totalRequirements}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${getComplianceBgColor(pillar.completenessPercentage)}`}
                                style={{ width: `${pillar.completenessPercentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getComplianceColor(pillar.completenessPercentage)}`}>
                              {pillar.completenessPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {pillar.implementedControls} / {pillar.totalControls}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${getComplianceBgColor(pillar.compliancePercentage)}`}
                                style={{ width: `${pillar.compliancePercentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getComplianceColor(pillar.compliancePercentage)}`}>
                              {pillar.compliancePercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {pillar.gaps > 0 && (
                              <span className="text-red-600 font-medium">
                                {pillar.gaps} {pillar.criticalGaps > 0 && `(${pillar.criticalGaps} critical)`}
                              </span>
                            )}
                            {pillar.gaps === 0 && <span className="text-green-600">0</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'affiliates' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">All Affiliates Overview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affiliate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compliance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completeness
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Controls
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gaps
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affiliatesOverview.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No affiliates found
                      </td>
                    </tr>
                  )}
                  {affiliatesOverview.map((aff) => {
                    const affiliate = affiliates.find(a => a.affiliateId === aff.affiliateId);
                    const affAny = aff as any;
                    return (
                      <>
                        <tr key={aff.affiliateId} className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              if (affiliate) {
                                setSelectedAffiliateId(String(affiliate._id));
                                setSelectedOrganizationId(String(affiliate.organizationId));
                                setActiveTab('overview');
                              }
                            }}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{aff.affiliateName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{aff.affiliateId || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{aff.organizationName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{aff.totalUsers || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${getComplianceBgColor(aff.overallCompliance)}`}
                                  style={{ width: `${aff.overallCompliance}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${getComplianceColor(aff.overallCompliance)}`}>
                                {aff.overallCompliance}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${getComplianceBgColor(aff.overallCompleteness)}`}
                                  style={{ width: `${aff.overallCompleteness}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${getComplianceColor(aff.overallCompleteness)}`}>
                                {aff.overallCompleteness}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {aff.implementedControls} / {aff.totalControls}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {affAny.totalGaps > 0 && (
                                <span className="text-red-600 font-medium">
                                  {affAny.totalGaps} {affAny.criticalGaps > 0 && `(${affAny.criticalGaps} critical)`}
                                </span>
                              )}
                              {(!affAny.totalGaps || affAny.totalGaps === 0) && <span className="text-green-600">0</span>}
                            </div>
                          </td>
                        </tr>
                        {/* Pillar Breakdown Row */}
                        {aff.pillarBreakdown && aff.pillarBreakdown.length > 0 && (
                          <tr key={`${aff.affiliateId}-breakdown`} className="bg-gray-50">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-700 mb-2">Breakdown by Pillar:</div>
                                <div className="grid grid-cols-5 gap-2">
                                  {aff.pillarBreakdown.map((pillar) => (
                                    <div key={pillar.pillar} className="bg-white p-2 rounded border">
                                      <div className="text-xs font-medium text-gray-700 mb-1">
                                        {getPillarLabel(pillar.pillar)}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Compliance: <span className={getComplianceColor(pillar.compliancePercentage)}>{pillar.compliancePercentage}%</span>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Completeness: <span className={getComplianceColor(pillar.completenessPercentage)}>{pillar.completenessPercentage}%</span>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Controls: {pillar.implementedControls}/{pillar.totalControls}
                                      </div>
                                      {pillar.gaps > 0 && (
                                        <div className="text-xs text-red-600 font-medium">
                                          Gaps: {pillar.gaps} {pillar.criticalGaps > 0 && `(${pillar.criticalGaps} critical)`}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

