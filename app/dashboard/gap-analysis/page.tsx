'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import Control from '@/models/Control';

const DORA_PILLARS = [
  { value: 'ICT_RISK_MANAGEMENT', label: 'ICT Risk Management' },
  { value: 'INCIDENT_MANAGEMENT', label: 'ICT-Related Incident Management' },
  { value: 'RESILIENCE_TESTING', label: 'Digital Operational Resilience Testing' },
  { value: 'THIRD_PARTY_RISK', label: 'ICT Third-Party Risk Management' },
  { value: 'INFORMATION_SHARING', label: 'Information Sharing' },
];

export default function GapAnalysisPage() {
  const router = useRouter();
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedPillar) {
      alert('Please select a DORA pillar');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiRequest('/gap-analysis', {
        method: 'POST',
        body: JSON.stringify({ pillar: selectedPillar }),
      });

      setGapAnalysis(response.gapAnalysis);
      const summary = response.summary || {};
      alert(`Gap analysis generated! Found ${summary.gaps || 0} gaps. Compliance: ${summary.compliancePercentage || 0}%`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const loadGapAnalysis = async () => {
    if (!selectedPillar) return;

    setLoading(true);
    try {
      const response = await apiRequest<{ gapAnalyses: any[] }>(`/gap-analysis?pillar=${selectedPillar}`);
      if (response.gapAnalyses && response.gapAnalyses.length > 0) {
        setGapAnalysis(response.gapAnalyses[0]);
      }
    } catch (error) {
      console.error('Failed to load gap analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGapAnalysis();
  }, [selectedPillar]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
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
              <Link href="/dashboard/gap-analysis" className="text-gray-700 hover:text-primary-600">
                Gap Analysis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Gap Analysis</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select DORA Pillar</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <select
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a pillar...</option>
                {DORA_PILLARS.map((pillar) => (
                  <option key={pillar.value} value={pillar.value}>
                    {pillar.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!selectedPillar || generating}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Gap Analysis'}
            </button>
          </div>
        </div>

        {gapAnalysis && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Summary - {DORA_PILLARS.find(p => p.value === selectedPillar)?.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Controls</p>
                  <p className="text-2xl font-bold text-blue-600">{gapAnalysis.totalControls}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Implemented</p>
                  <p className="text-2xl font-bold text-green-600">{gapAnalysis.implementedControls}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Gaps</p>
                  <p className="text-2xl font-bold text-red-600">{gapAnalysis.gaps.length}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Compliance</p>
                  <p className="text-2xl font-bold text-purple-600">{gapAnalysis.compliancePercentage}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Main Findings by Priority</h2>
              <div className="space-y-4">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => {
                  const priorityGaps = gapAnalysis.gaps.filter((g: any) => g.priority === priority);
                  if (priorityGaps.length === 0) return null;
                  
                  return (
                    <div key={priority} className="border-l-4 border-gray-300 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-semibold ${getPriorityColor(priority).split(' ')[1]}`}>
                          {priority} Priority ({priorityGaps.length} gaps)
                        </h3>
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getPriorityColor(priority)}`}>
                          {priority}
                        </span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        {priorityGaps.slice(0, 5).map((gap: any, idx: number) => (
                          <li key={idx}>
                            <span className="font-medium">{gap.controlTitle || gap.controlId || 'Control'}</span>
                            {gap.requirementNames && gap.requirementNames.length > 0 && (
                              <span className="text-gray-500"> - {gap.requirementNames.slice(0, 2).join(', ')}{gap.requirementNames.length > 2 ? '...' : ''}</span>
                            )}
                            <span className="text-gray-400">: {gap.gapDescription}</span>
                          </li>
                        ))}
                        {priorityGaps.length > 5 && (
                          <li className="text-gray-400 italic">...and {priorityGaps.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Gap Analysis Findings by Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-red-700 mb-2">Not Implemented</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {gapAnalysis.gaps.filter((g: any) => g.status === 'NOT_IMPLEMENTED').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Controls requiring immediate attention</p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-semibold text-yellow-700 mb-2">Partially Implemented</h3>
                  <p className="text-2xl font-bold text-yellow-600">
                    {gapAnalysis.gaps.filter((g: any) => g.status === 'PARTIALLY_IMPLEMENTED').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Controls needing completion</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-green-700 mb-2">Fully Implemented</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {gapAnalysis.gaps.filter((g: any) => g.status === 'FULLY_IMPLEMENTED').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Controls in compliance</p>
                </div>
                <div className="border-l-4 border-gray-500 pl-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Not Applicable</h3>
                  <p className="text-2xl font-bold text-gray-600">
                    {gapAnalysis.gaps.filter((g: any) => g.status === 'NOT_APPLICABLE').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Controls not relevant to your assets</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Gaps Identified</h2>
              <div className="space-y-4">
                {gapAnalysis.gaps.map((gap: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {gap.controlTitle || gap.controlId || 'Control'}
                        </h3>
                        {gap.controlDescription && (
                          <p className="text-sm text-gray-600 mb-2">{gap.controlDescription}</p>
                        )}
                        {gap.requirementNames && gap.requirementNames.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">Linked Requirements:</p>
                            <div className="flex flex-wrap gap-1">
                              {gap.requirementNames.map((reqName: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {reqName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(gap.priority)}`}>
                        {gap.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{gap.gapDescription}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Status: <span className="font-medium">{gap.status}</span>
                      </span>
                      {gap.controlId && (
                        <span>
                          Control ID: <span className="font-mono">{gap.controlId}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/dashboard/remediation"
                className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
              >
                Generate Remediation Plan
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

