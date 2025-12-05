'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

interface Control {
  _id: string;
  controlId: string;
  title: string;
  description: string;
  pillar: string;
  complianceStatus?: string;
  notes?: string;
  iso27001Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: string;
  }>;
}

const COMPLIANCE_STATUSES = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', color: 'bg-gray-100 text-gray-800' },
  { value: 'FULLY_COMPLIANT', label: 'Fully Compliant', color: 'bg-green-100 text-green-800' },
  { value: 'PARTIALLY_COMPLIANT', label: 'Partially Compliant', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'NOT_COMPLIANT', label: 'Not Compliant', color: 'bg-red-100 text-red-800' },
];

export default function ControlsPage() {
  const router = useRouter();
  const [controls, setControls] = useState<Control[]>([]);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [showISO27001, setShowISO27001] = useState(false);
  const [isoSuggestions, setIsoSuggestions] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<string>('');

  useEffect(() => {
    loadControls();
  }, [selectedPillar]);

  const loadControls = async () => {
    try {
      const url = selectedPillar 
        ? `/controls?pillar=${selectedPillar}`
        : '/controls';
      const response = await apiRequest<{ controls: Control[] }>(url);
      setControls(response.controls);
    } catch (error) {
      console.error('Failed to load controls:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
                Nexus Cloud
              </Link>
              <Link href="/dashboard/controls" className="text-gray-700 hover:text-primary-600">
                Controls
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Controls</h1>

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
            {controls.map((control) => (
              <div key={control._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{control.controlId}: {control.title}</h3>
                    <p className="text-gray-700 mb-2">{control.description}</p>
                    <span className="text-sm text-gray-500 capitalize">
                      {control.pillar.replace(/_/g, ' ')}
                    </span>
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
                    <button
                      onClick={() => loadISOSuggestions(control)}
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
        {showISO27001 && selectedControl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">ISO 27001 Suggestions</h2>
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

