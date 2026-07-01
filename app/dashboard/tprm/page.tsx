'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import TPRMProviderWizard from '@/components/wizards/TPRMProviderWizard';
import TPRMFollowUpWizard from '@/components/wizards/TPRMFollowUpWizard';

interface TPRMProvider {
  _id: string;
  providerId: string;
  name: string;
  companyName: string;
  country: string;
  providerType: string;
  criticalityLevel: number;
  servicesProvided: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'PENDING_ASSESSMENT';
  concentrationRisk: boolean;
  contractSigned: boolean;
  doraContractualClauses: {
    auditRights: boolean;
    exitStrategy: boolean;
    incidentNotification: boolean;
    serviceLevelAgreement: boolean;
    dataLocation: boolean;
    subContractingControls: boolean;
  };
  followUp?: {
    owner?: string;
    frequencyDays?: number;
    lastReviewDate?: string;
    nextReviewDate?: string;
    status?: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE';
    notes?: string;
  };
  incidentPlaybookUrl?: string;
  incidentResponseContact?: string;
  incidentLog?: Array<{
    createdAt: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    actionsTaken?: string[];
  }>;
  status: string;
}

interface TPRMSummary {
  total: number;
  compliant: number;
  nonCompliant: number;
  criticalRisk: number;
  concentrationRisk: number;
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const COMPLIANCE_COLORS: Record<string, string> = {
  COMPLIANT: 'bg-green-100 text-green-800',
  NON_COMPLIANT: 'bg-red-100 text-red-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  PENDING_ASSESSMENT: 'bg-gray-100 text-gray-800',
};

function ClauseIndicator({ met, label }: { met: boolean; label: string }) {
  return (
    <span
      title={label}
      className={`inline-block w-3 h-3 rounded-full ${met ? 'bg-green-500' : 'bg-red-300'}`}
    />
  );
}

export default function TPRMPage() {
  const [providers, setProviders] = useState<TPRMProvider[]>([]);
  const [summary, setSummary] = useState<TPRMSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProviderWizard, setShowProviderWizard] = useState(false);
  const [followUpProvider, setFollowUpProvider] = useState<TPRMProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [showIncidentWalkthrough, setShowIncidentWalkthrough] = useState(false);
  const [incidentProviderId, setIncidentProviderId] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ providers: TPRMProvider[]; summary: TPRMSummary }>(
        '/tprm/providers'
      );
      setProviders(response.providers);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to load TPRM providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const tprmCompliancePct =
    summary && summary.total > 0
      ? Math.round((summary.compliant / summary.total) * 100)
      : 0;

  const createProviderFromWizard = async (payload: Record<string, any>) => {
    try {
      setSaving(true);
      await apiRequest('/tprm/providers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowProviderWizard(false);
      await loadProviders();
    } catch (error) {
      console.error('Failed to create provider from wizard:', error);
      alert('Failed to create provider. Please review fields and retry.');
    } finally {
      setSaving(false);
    }
  };

  const saveFollowUp = async (payload: Record<string, any>) => {
    try {
      setSaving(true);
      await apiRequest('/tprm/providers', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setFollowUpProvider(null);
      await loadProviders();
    } catch (error) {
      console.error('Failed to save provider follow-up:', error);
      alert('Failed to save follow-up. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const launchIncidentWalkthrough = async () => {
    const provider = providers.find((p) => (p.providerId || p._id) === incidentProviderId);
    if (!provider) {
      alert('Please select a provider to start incident walkthrough.');
      return;
    }

    const nowIso = new Date().toISOString();
    const existingLog = provider.incidentLog || [];
    const walkthroughEntry = {
      createdAt: nowIso,
      severity: provider.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      summary: 'Incident walkthrough initiated from TPRM dashboard',
      actionsTaken: [
        'Escalation initiated',
        'Provider incident response contact engaged',
        'Contractual incident notification obligations reviewed',
      ],
    };

    await saveFollowUp({
      providerId: provider.providerId || provider._id,
      complianceStatus: 'UNDER_REVIEW',
      followUp: {
        ...(provider.followUp || {}),
        status: 'DUE_SOON',
        lastReviewDate: nowIso,
        notes:
          (provider.followUp?.notes ? `${provider.followUp.notes}\n` : '') +
          'Incident walkthrough started from dashboard.',
      },
      incidentLog: [...existingLog, walkthroughEntry],
    });
    setShowIncidentWalkthrough(false);
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
              <Link href="/dashboard/tprm" className="text-gray-700 hover:text-primary-600 font-medium">
                TPRM
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Third-Party Risk Management (TPRM)</h1>
          <p className="text-gray-600 mt-2">
            DORA ICT Third-Party Risk — Article 28-30 compliance. Extends the{' '}
            <span className="font-medium">THIRD_PARTY_RISK</span> pillar with vendor registry,
            contractual clause tracking, and concentration risk monitoring.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setShowProviderWizard(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              + Provider Follow-up Wizard
            </button>
            <button
              onClick={() => setShowIncidentWalkthrough(true)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              Incident Walkthrough
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading TPRM data...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white p-5 rounded-lg shadow">
                <p className="text-sm text-gray-500">Total Providers</p>
                <p className="text-3xl font-bold text-primary-600">{summary?.total || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow">
                <p className="text-sm text-gray-500">TPRM Compliance</p>
                <p className={`text-3xl font-bold ${tprmCompliancePct >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                  {tprmCompliancePct}%
                </p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow">
                <p className="text-sm text-gray-500">Compliant</p>
                <p className="text-3xl font-bold text-green-600">{summary?.compliant || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow">
                <p className="text-sm text-gray-500">Critical Risk</p>
                <p className="text-3xl font-bold text-red-600">{summary?.criticalRisk || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow">
                <p className="text-sm text-gray-500">Concentration Risk</p>
                <p className="text-3xl font-bold text-orange-600">{summary?.concentrationRisk || 0}</p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
              <p className="text-sm text-blue-800">
                <strong>DORA Contractual Clauses:</strong> Audit rights · Exit strategy · Incident
                notification · SLA · Data location · Sub-contracting controls
              </p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criticality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DORA Clauses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {providers.map((provider) => (
                    <tr key={provider._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{provider.name}</div>
                        <div className="text-sm text-gray-500">{provider.companyName}</div>
                        {provider.concentrationRisk && (
                          <span className="text-xs text-orange-600 font-medium">⚠ Concentration risk</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{provider.providerType.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">Level {provider.criticalityLevel}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <ClauseIndicator met={provider.doraContractualClauses.auditRights} label="Audit rights" />
                          <ClauseIndicator met={provider.doraContractualClauses.exitStrategy} label="Exit strategy" />
                          <ClauseIndicator met={provider.doraContractualClauses.incidentNotification} label="Incident notification" />
                          <ClauseIndicator met={provider.doraContractualClauses.serviceLevelAgreement} label="SLA" />
                          <ClauseIndicator met={provider.doraContractualClauses.dataLocation} label="Data location" />
                          <ClauseIndicator met={provider.doraContractualClauses.subContractingControls} label="Sub-contracting" />
                        </div>
                        {!provider.contractSigned && (
                          <span className="text-xs text-red-600">No contract</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${RISK_COLORS[provider.riskLevel]}`}>
                          {provider.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${COMPLIANCE_COLORS[provider.complianceStatus]}`}>
                          {provider.complianceStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-y-2">
                        <div className="text-xs text-gray-600">
                          Owner: {provider.followUp?.owner || 'Not set'}
                        </div>
                        <div className="text-xs text-gray-600">
                          Status: {(provider.followUp?.status || 'ON_TRACK').replace(/_/g, ' ')}
                        </div>
                        <button
                          onClick={() => setFollowUpProvider(provider)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Open Follow-up Wizard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-4">
              <Link
                href="/dashboard/gap-analysis?pillar=THIRD_PARTY_RISK"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Run Third-Party Gap Analysis
              </Link>
              <Link
                href="/dashboard/questionnaire"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Update Questionnaire
              </Link>
            </div>
          </>
        )}
      </main>

      {showProviderWizard && (
        <TPRMProviderWizard
          onComplete={createProviderFromWizard}
          onCancel={() => setShowProviderWizard(false)}
        />
      )}

      {followUpProvider && (
        <TPRMFollowUpWizard
          provider={followUpProvider}
          onComplete={saveFollowUp}
          onCancel={() => setFollowUpProvider(null)}
        />
      )}

      {showIncidentWalkthrough && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">TPRM Incident Walkthrough</h3>
              <button onClick={() => setShowIncidentWalkthrough(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select a provider and trigger an incident-response follow-up. This marks the provider
              as under review and records a walkthrough log entry.
            </p>
            <select
              value={incidentProviderId}
              onChange={(e) => setIncidentProviderId(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
            >
              <option value="">Select provider</option>
              {providers.map((provider) => (
                <option key={provider._id} value={provider.providerId || provider._id}>
                  {provider.name} ({provider.riskLevel})
                </option>
              ))}
            </select>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 mb-6">
              Checklist: notify stakeholders, validate contractual incident clauses, open corrective
              actions, and schedule post-incident review.
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowIncidentWalkthrough(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={launchIncidentWalkthrough}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Running...' : 'Start Walkthrough'}
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-3 py-2 rounded">
          Saving TPRM update...
        </div>
      )}
    </div>
  );
}
