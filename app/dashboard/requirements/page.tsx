'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { LanguageToggle } from '@/components/LanguageToggle';

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
  associatedControlsCount?: number;
  iso27001Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: string;
  }>;
}

interface AssociatedControl {
  _id: string;
  controlId: string;
  title: string;
  description: string;
  pillar: string;
  controlType: string;
  complianceStatus?: string;
}

// Will be set dynamically based on regulation
let PILLARS: Array<{ value: string; label: string }> = [];

const COMPLIANCE_STATUSES = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', color: 'bg-gray-100 text-gray-800' },
  { value: 'FULLY_COMPLIANT', label: 'Fully Compliant', color: 'bg-green-100 text-green-800' },
  { value: 'PARTIALLY_COMPLIANT', label: 'Partially Compliant', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'NOT_COMPLIANT', label: 'Not Compliant', color: 'bg-red-100 text-red-800' },
];

export default function RequirementsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useTranslation();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showISO27001, setShowISO27001] = useState(false);
  const [isoSuggestions, setIsoSuggestions] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set());
  const [associatedControls, setAssociatedControls] = useState<Record<string, AssociatedControl[]>>({});
  const [loadingControls, setLoadingControls] = useState<Set<string>>(new Set());

  // Detect regulation from route
  const isChileanPrivacy = pathname?.includes('chile-privacy') || pathname?.includes('chilean-privacy');
  const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
  
  // Get pillars dynamically
  const config = getRegulationConfig(regulationType);
  const pillars = config.pillars.map(p => ({
    value: p.id,
    label: language === 'es' && p.nameEs ? p.nameEs : p.name,
  }));

  useEffect(() => {
    loadRequirements();
  }, [regulationType]);

  useEffect(() => {
    filterRequirements();
  }, [requirements, selectedPillar, selectedStatus, pillars]);

  const loadRequirements = async () => {
    try {
      const response = await apiRequest<{ requirements: Requirement[] }>(`/requirements?includeCounts=true&regulation=${regulationType}`);
      setRequirements(response.requirements);
    } catch (error) {
      console.error('Failed to load requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssociatedControls = async (requirementId: string) => {
    if (associatedControls[requirementId]) {
      // Already loaded, just toggle expansion
      return;
    }

    setLoadingControls(prev => new Set(prev).add(requirementId));
    try {
      const response = await apiRequest<{ controls: AssociatedControl[] }>(
        `/requirements/${requirementId}/controls`
      );
      setAssociatedControls(prev => ({
        ...prev,
        [requirementId]: response.controls,
      }));
    } catch (error) {
      console.error('Failed to load associated controls:', error);
      setAssociatedControls(prev => ({
        ...prev,
        [requirementId]: [],
      }));
    } finally {
      setLoadingControls(prev => {
        const newSet = new Set(prev);
        newSet.delete(requirementId);
        return newSet;
      });
    }
  };

  const toggleControlsExpansion = (requirementId: string) => {
    const isExpanded = expandedRequirements.has(requirementId);
    if (isExpanded) {
      setExpandedRequirements(prev => {
        const newSet = new Set(prev);
        newSet.delete(requirementId);
        return newSet;
      });
    } else {
      setExpandedRequirements(prev => new Set(prev).add(requirementId));
      loadAssociatedControls(requirementId);
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
              <Link 
                href={isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard'} 
                className={`text-2xl font-bold ${isChileanPrivacy ? 'text-blue-600' : 'text-primary-600'}`}
              >
                {isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud'}
              </Link>
              <Link 
                href={isChileanPrivacy ? '/chile-privacy/dashboard/requirements' : '/dashboard/requirements'} 
                className="text-gray-700 hover:text-primary-600"
              >
                Requirements
              </Link>
            </div>
            <div className="flex items-center">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {isChileanPrivacy 
                ? (language === 'es' ? 'Requisitos de Ley 21.719' : 'Ley 21.719 Requirements')
                : 'DORA Requirements'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isChileanPrivacy
                ? (language === 'es' 
                    ? 'Requisitos de la Ley de Protección de Datos Personales de Chile'
                    : 'Chilean Personal Data Protection Law requirements')
                : 'Requirements are automatically imported from JSON on first access'}
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
                {pillars.map((pillar) => (
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
        ) : filteredRequirements.length === 0 && requirements.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No requirements found. Import requirements to get started.</p>
            <p className="text-sm text-gray-500 mb-4">
              Run: <code className="bg-gray-100 px-2 py-1 rounded">npm run load:chilean-privacy</code> to load all data.
            </p>
            <button
              onClick={loadRequirements}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
            <div className="mt-4 text-xs text-gray-500">
              <p>Total requirements loaded: {requirements.length}</p>
              <p>Filtered requirements: {filteredRequirements.length}</p>
            </div>
          </div>
        ) : filteredRequirements.length === 0 && requirements.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No requirements match the current filters.</p>
            <p className="text-sm text-gray-500 mt-2">Total requirements: {requirements.length}</p>
            <button
              onClick={() => {
                setSelectedPillar('');
                setSelectedStatus('');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequirements.map((requirement) => {
              const isExpanded = expandedRequirements.has(requirement.requirementId);
              const controls = associatedControls[requirement.requirementId] || [];
              const isLoading = loadingControls.has(requirement.requirementId);
              const controlsCount = requirement.associatedControlsCount ?? 0;

              return (
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
                        {controlsCount > 0 && (
                          <button
                            onClick={() => toggleControlsExpansion(requirement.requirementId)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <span>{controlsCount} Control{controlsCount !== 1 ? 's' : ''}</span>
                            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>
                        )}
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

                  {/* Expandable Controls Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">
                        Associated Controls ({controlsCount})
                      </h4>
                      {isLoading ? (
                        <div className="text-sm text-gray-500 py-2">Loading controls...</div>
                      ) : controls.length === 0 ? (
                        <div className="text-sm text-gray-500 py-2">No controls associated with this requirement.</div>
                      ) : (
                        <div className="space-y-2">
                          {controls.map((control) => (
                            <div key={control._id} className="bg-gray-50 rounded p-3 border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{control.controlId}</span>
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                      {control.controlType}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-1">{control.title}</p>
                                  <p className="text-xs text-gray-500">{control.description}</p>
                                </div>
                                {control.complianceStatus && (
                                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(control.complianceStatus)}`}>
                                    {control.complianceStatus.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

