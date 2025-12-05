'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

interface Requirement {
  _id: string;
  requirementId: string;
  chapter?: string;
  article?: string;
  title: string;
  description: string;
  pillar: string;
  complianceStatus: string;
  notes?: string;
  iso27001Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: string;
  }>;
}

const DORA_PILLARS = [
  { value: 'ICT_RISK_MANAGEMENT', label: 'ICT Risk Management' },
  { value: 'INCIDENT_MANAGEMENT', label: 'ICT-Related Incident Management' },
  { value: 'RESILIENCE_TESTING', label: 'Digital Operational Resilience Testing' },
  { value: 'THIRD_PARTY_RISK', label: 'ICT Third-Party Risk Management' },
  { value: 'INFORMATION_SHARING', label: 'Information Sharing' },
];

const COMPLIANCE_STATUSES = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', color: 'bg-gray-100 text-gray-800' },
  { value: 'FULLY_COMPLIANT', label: 'Fully Compliant', color: 'bg-green-100 text-green-800' },
  { value: 'PARTIALLY_COMPLIANT', label: 'Partially Compliant', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'NOT_COMPLIANT', label: 'Not Compliant', color: 'bg-red-100 text-red-800' },
];

export default function RequirementsPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showISO27001, setShowISO27001] = useState(false);
  const [isoSuggestions, setIsoSuggestions] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadRequirements();
  }, []);

  useEffect(() => {
    filterRequirements();
  }, [requirements, selectedPillar, selectedStatus]);

  const loadRequirements = async () => {
    try {
      const response = await apiRequest<{ requirements: Requirement[] }>('/requirements');
      setRequirements(response.requirements);
    } catch (error) {
      console.error('Failed to load requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequirements = () => {
    let filtered = requirements;
    
    if (selectedPillar) {
      filtered = filtered.filter(r => r.pillar === selectedPillar);
    }
    
    if (selectedStatus) {
      filtered = filtered.filter(r => r.complianceStatus === selectedStatus);
    }
    
    setFilteredRequirements(filtered);
  };

  const handleComplianceChange = async (requirementId: string, complianceStatus: string) => {
    setUpdating(requirementId);
    try {
      await apiRequest(`/requirements/${requirementId}/compliance`, {
        method: 'PUT',
        body: JSON.stringify({ complianceStatus }),
      });
      
      // Update local state
      setRequirements(requirements.map(r => 
        r.requirementId === requirementId 
          ? { ...r, complianceStatus }
          : r
      ));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const loadISOSuggestions = async (requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setShowISO27001(true);
    
    try {
      const response = await apiRequest<{ suggestions: any[] }>(
        `/iso27001/suggestions?requirementId=${requirement.requirementId}`
      );
      setIsoSuggestions(response.suggestions);
    } catch (error) {
      console.error('Failed to load ISO 27001 suggestions:', error);
      setIsoSuggestions(requirement.iso27001Mappings || []);
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = COMPLIANCE_STATUSES.find(s => s.value === status);
    return statusObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
                Nexus Cloud
              </Link>
              <Link href="/dashboard/requirements" className="text-gray-700 hover:text-primary-600">
                Requirements
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">DORA Requirements</h1>
            <p className="text-sm text-gray-500 mt-1">
              Requirements are automatically imported from JSON on first access
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                const response = await apiRequest('/requirements/import-json', { method: 'GET' });
                alert(`Imported ${response.imported} requirements`);
                loadRequirements();
              } catch (error: any) {
                alert(`Error: ${error.message}`);
              }
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Re-import from JSON
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Pillar
              </label>
              <select
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Pillars</option>
                {DORA_PILLARS.map((pillar) => (
                  <option key={pillar.value} value={pillar.value}>
                    {pillar.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Compliance Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Statuses</option>
                {COMPLIANCE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requirements List */}
        {loading ? (
          <div className="text-center py-8">Loading requirements...</div>
        ) : filteredRequirements.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No requirements found. Import requirements to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequirements.map((requirement) => (
              <div key={requirement._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{requirement.requirementId}</h3>
                      {requirement.article && (
                        <span className="text-sm text-gray-500">{requirement.article}</span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-2">{requirement.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {requirement.chapter && <span>{requirement.chapter}</span>}
                      <span className="capitalize">{requirement.pillar.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={requirement.complianceStatus}
                      onChange={(e) => handleComplianceChange(requirement.requirementId, e.target.value)}
                      disabled={updating === requirement.requirementId}
                      className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(requirement.complianceStatus)} border-0`}
                    >
                      {COMPLIANCE_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => loadISOSuggestions(requirement)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                    >
                      ISO 27001
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ISO 27001 Modal */}
        {showISO27001 && selectedRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">ISO 27001 Suggestions</h2>
                  <button
                    onClick={() => {
                      setShowISO27001(false);
                      setSelectedRequirement(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">{selectedRequirement.requirementId}</h3>
                  <p className="text-sm text-gray-600">{selectedRequirement.description}</p>
                </div>

                {isoSuggestions.length === 0 ? (
                  <p className="text-gray-500">No ISO 27001 mappings available for this requirement.</p>
                ) : (
                  <div className="space-y-4">
                    {isoSuggestions.map((mapping, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{mapping.control}</h4>
                            <p className="text-gray-700">{mapping.title}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRelevanceColor(mapping.relevance)}`}>
                            {mapping.relevance} Relevance
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{mapping.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

