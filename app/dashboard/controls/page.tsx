'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { RegulationType } from '@/lib/regulations';
import { LanguageToggle } from '@/components/LanguageToggle';

interface Control {
  _id: string;
  controlId: string;
  title: string;
  description: string;
  pillar: string;
  complianceStatus?: string;
  notes?: string;
  associatedRequirementsCount?: number;
  iso27001Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: string;
  }>;
  category?: string;
  standard?: string;
}

interface AssociatedRequirement {
  _id: string;
  requirementId: string;
  title: string;
  description: string;
  pillar: string;
  complianceStatus?: string;
}

const COMPLIANCE_STATUSES = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', color: 'bg-gray-100 text-gray-800' },
  { value: 'FULLY_COMPLIANT', label: 'Fully Compliant', color: 'bg-green-100 text-green-800' },
  { value: 'PARTIALLY_COMPLIANT', label: 'Partially Compliant', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'NOT_COMPLIANT', label: 'Not Compliant', color: 'bg-red-100 text-red-800' },
];

export default function ControlsPage() {
  const router = useRouter();
  const { language } = useTranslation();
  const pathname = usePathname();
  const isChileanPrivacy = pathname?.includes('chile-privacy') || pathname?.includes('chilean-privacy');
  const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
  const [controls, setControls] = useState<Control[]>([]);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [showISO27001, setShowISO27001] = useState(false);
  const [isoSuggestions, setIsoSuggestions] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [expandedControls, setExpandedControls] = useState<Set<string>>(new Set());
  const [associatedRequirements, setAssociatedRequirements] = useState<Record<string, AssociatedRequirement[]>>({});
  const [loadingRequirements, setLoadingRequirements] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadControls();
  }, [selectedPillar]);

  const loadControls = async () => {
    try {
      const url = selectedPillar 
        ? `/controls?pillar=${selectedPillar}&regulation=${regulationType}&includeCounts=true`
        : `/controls?regulation=${regulationType}&includeCounts=true`;
      const response = await apiRequest<{ controls: Control[] }>(url);
      setControls(response.controls);
    } catch (error) {
      console.error('Failed to load controls:', error);
    }
  };

  const loadAssociatedRequirements = async (controlId: string) => {
    if (associatedRequirements[controlId]) {
      // Already loaded, just toggle expansion
      return;
    }

    setLoadingRequirements(prev => new Set(prev).add(controlId));
    try {
      const response = await apiRequest<{ requirements: AssociatedRequirement[] }>(
        `/controls/${controlId}/requirements`
      );
      setAssociatedRequirements(prev => ({
        ...prev,
        [controlId]: response.requirements,
      }));
    } catch (error) {
      console.error('Failed to load associated requirements:', error);
      setAssociatedRequirements(prev => ({
        ...prev,
        [controlId]: [],
      }));
    } finally {
      setLoadingRequirements(prev => {
        const newSet = new Set(prev);
        newSet.delete(controlId);
        return newSet;
      });
    }
  };

  const toggleRequirementsExpansion = (controlId: string) => {
    const isExpanded = expandedControls.has(controlId);
    if (isExpanded) {
      setExpandedControls(prev => {
        const newSet = new Set(prev);
        newSet.delete(controlId);
        return newSet;
      });
    } else {
      setExpandedControls(prev => new Set(prev).add(controlId));
      loadAssociatedRequirements(controlId);
    }
  };

  const handleComplianceChange = async (controlId: string, complianceStatus: string) => {
    setUpdating(controlId);
    try {
      await apiRequest(`/controls/${controlId}/compliance`, {
        method: 'PUT',
        body: JSON.stringify({ complianceStatus }),
      });
      
      setControls(controls.map(c => 
        c.controlId === controlId 
          ? { ...c, complianceStatus }
          : c
      ));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const loadISOSuggestions = async (control: Control) => {
    setSelectedControl(control);
    setShowISO27001(true);
    
    try {
      const response = await apiRequest<{ suggestions: any[] }>(
        `/iso27001/suggestions?controlId=${control.controlId}`
      );
      setIsoSuggestions(response.suggestions);
    } catch (error) {
      console.error('Failed to load ISO 27001 suggestions:', error);
      setIsoSuggestions(control.iso27001Mappings || []);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
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

  const getControlStandard = (control: Control): string => {
    const controlId = control.controlId.toUpperCase();
    
    // Check controlId patterns (order matters - more specific first)
    if (controlId.includes('ISO27701') || controlId.startsWith('ISO27701-')) {
      return 'ISO 27701';
    }
    if (controlId.includes('ISO27002') || controlId.startsWith('ISO27002-')) {
      return 'ISO 27002';
    }
    if (controlId.includes('ISO-20000') || controlId.includes('ISO20000')) {
      return 'ISO 20000';
    }
    if (controlId.includes('ISO27017')) {
      return 'ISO 27017';
    }
    if (controlId.includes('ISO27018')) {
      return 'ISO 27018';
    }
    if (controlId.includes('ISO22301')) {
      return 'ISO 22301';
    }
    if (controlId.includes('ISO31000')) {
      return 'ISO 31000';
    }
    // Check if controlId starts with "ISO-" (generic ISO 27002 pattern)
    if (controlId.startsWith('ISO-')) {
      return 'ISO 27002';
    }
    // Check if there's a standard field
    if (control.standard) {
      return control.standard;
    }
    // Check category
    if (control.category === 'PRIVACY') {
      return 'ISO 27701';
    }
    // Default fallback
    if (control.iso27001Mappings && control.iso27001Mappings.length > 0) {
      return 'ISO 27001';
    }
    return 'ISO 27001'; // Default
  };

  const getStandardColor = (standard: string): string => {
    switch (standard) {
      case 'ISO 27701':
        return 'bg-purple-100 text-purple-800';
      case 'ISO 27002':
        return 'bg-indigo-100 text-indigo-800';
      case 'ISO 20000':
        return 'bg-teal-100 text-teal-800';
      case 'ISO 27017':
        return 'bg-cyan-100 text-cyan-800';
      case 'ISO 27018':
        return 'bg-sky-100 text-sky-800';
      case 'ISO 22301':
        return 'bg-emerald-100 text-emerald-800';
      case 'ISO 31000':
        return 'bg-violet-100 text-violet-800';
      case 'ISO 27001':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href={isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard'} className={`text-2xl font-bold ${isChileanPrivacy ? 'text-blue-600' : 'text-primary-600'}`}>
                {isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud'}
              </Link>
              <Link href={isChileanPrivacy ? '/chile-privacy/dashboard/controls' : '/dashboard/controls'} className="text-gray-700 hover:text-primary-600">
                Controls
              </Link>
            </div>
            <div className="flex items-center">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold">{isChileanPrivacy ? (language === 'es' ? 'Controles' : 'Controls') : 'Controls'}</h1>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Pillar
          </label>
          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Pillars</option>
            <option value="ICT_RISK_MANAGEMENT">ICT Risk Management</option>
            <option value="INCIDENT_MANAGEMENT">Incident Management</option>
            <option value="RESILIENCE_TESTING">Resilience Testing</option>
            <option value="THIRD_PARTY_RISK">Third Party Risk</option>
            <option value="INFORMATION_SHARING">Information Sharing</option>
          </select>
        </div>

        {/* Controls List */}
        {controls.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No controls found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {controls.map((control) => {
              const isExpanded = expandedControls.has(control.controlId);
              const requirements = associatedRequirements[control.controlId] || [];
              const isLoading = loadingRequirements.has(control.controlId);
              const requirementsCount = control.associatedRequirementsCount ?? 0;

              return (
                <div key={control._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{control.controlId}: {control.title}</h3>
                      <p className="text-gray-700 mb-2">{control.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="capitalize">{control.pillar.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStandardColor(getControlStandard(control))}`}>
                          {getControlStandard(control)}
                        </span>
                        {requirementsCount > 0 && (
                          <button
                            onClick={() => toggleRequirementsExpansion(control.controlId)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <span>{requirementsCount} {language === 'es' ? 'Requisito' : 'Requirement'}{requirementsCount !== 1 ? (language === 'es' ? 's' : 's') : ''}</span>
                            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={control.complianceStatus || 'NOT_APPLICABLE'}
                        onChange={(e) => handleComplianceChange(control.controlId, e.target.value)}
                        disabled={updating === control.controlId}
                        className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(control.complianceStatus)} border-0`}
                      >
                        {COMPLIANCE_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getStandardColor(getControlStandard(control))}`}>
                        {getControlStandard(control)}
                      </span>
                      {control.iso27001Mappings && control.iso27001Mappings.length > 0 && (
                        <button
                          onClick={() => loadISOSuggestions(control)}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                        >
                          {language === 'es' ? 'Ver Mapeos' : 'View Mappings'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Requirements Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">
                        Associated Requirements ({requirementsCount})
                      </h4>
                      {isLoading ? (
                        <div className="text-sm text-gray-500 py-2">Loading requirements...</div>
                      ) : requirements.length === 0 ? (
                        <div className="text-sm text-gray-500 py-2">No requirements associated with this control.</div>
                      ) : (
                        <div className="space-y-2">
                          {requirements.map((requirement) => (
                            <div key={requirement._id} className="bg-gray-50 rounded p-3 border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{requirement.requirementId}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-1">{requirement.title}</p>
                                  <p className="text-xs text-gray-500">{requirement.description}</p>
                                </div>
                                {requirement.complianceStatus && (
                                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(requirement.complianceStatus)}`}>
                                    {requirement.complianceStatus.replace(/_/g, ' ')}
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

        {/* ISO Mappings Modal */}
        {showISO27001 && selectedControl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {getControlStandard(selectedControl)} {language === 'es' ? 'Mapeos' : 'Mappings'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowISO27001(false);
                      setSelectedControl(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">{selectedControl.controlId}</h3>
                  <p className="text-sm text-gray-600">{selectedControl.description}</p>
                </div>

                {isoSuggestions.length === 0 ? (
                  <p className="text-gray-500">No ISO 27001 mappings available for this control.</p>
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

