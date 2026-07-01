'use client';

import Wizard from '../Wizard';

interface TPRMProviderWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function TPRMProviderWizard({ onComplete, onCancel }: TPRMProviderWizardProps) {
  const steps = [
    {
      id: 'provider',
      title: 'Provider Profile',
      description: 'Create a new ICT third-party provider for TPRM tracking.',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Provider name"
            value={data.name || ''}
            onChange={(e) => updateData({ name: e.target.value })}
          />
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Company name"
            value={data.companyName || ''}
            onChange={(e) => updateData({ companyName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="Contact email"
              value={data.contactEmail || ''}
              onChange={(e) => updateData({ contactEmail: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="Country (e.g. ES)"
              value={data.country || ''}
              onChange={(e) => updateData({ country: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="w-full px-3 py-2 border rounded"
              value={data.providerType || ''}
              onChange={(e) => updateData({ providerType: e.target.value })}
            >
              <option value="">Provider type</option>
              <option value="CLOUD_IAAS">Cloud IaaS</option>
              <option value="CLOUD_PAAS">Cloud PaaS</option>
              <option value="CLOUD_SAAS">Cloud SaaS</option>
              <option value="DATA_CENTER">Data Center</option>
              <option value="PAYMENT_NETWORK">Payment Network</option>
              <option value="SOFTWARE_VENDOR">Software Vendor</option>
              <option value="MANAGED_SECURITY">Managed Security</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              className="w-full px-3 py-2 border rounded"
              value={String(data.criticalityLevel || '')}
              onChange={(e) => updateData({ criticalityLevel: Number(e.target.value) })}
            >
              <option value="">Criticality</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
          </div>
          <textarea
            className="w-full px-3 py-2 border rounded"
            rows={3}
            placeholder="Services provided (one per line)"
            value={(data.servicesProvided || []).join('\n')}
            onChange={(e) => updateData({ servicesProvided: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) })}
          />
        </div>
      ),
    },
    {
      id: 'followup',
      title: 'Follow-up Settings',
      description: 'Define follow-up ownership and cadence.',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Follow-up owner (name/email)"
            value={data.owner || ''}
            onChange={(e) => updateData({ owner: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={7}
              className="w-full px-3 py-2 border rounded"
              placeholder="Frequency days (e.g. 90)"
              value={data.frequencyDays || 90}
              onChange={(e) => updateData({ frequencyDays: Number(e.target.value) })}
            />
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={data.nextReviewDate || ''}
              onChange={(e) => updateData({ nextReviewDate: e.target.value })}
            />
          </div>
          <textarea
            className="w-full px-3 py-2 border rounded"
            rows={3}
            placeholder="Follow-up notes"
            value={data.notes || ''}
            onChange={(e) => updateData({ notes: e.target.value })}
          />
        </div>
      ),
    },
    {
      id: 'incident',
      title: 'Incident Readiness',
      description: 'Store incident walkthrough references for this provider.',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Incident response contact"
            value={data.incidentResponseContact || ''}
            onChange={(e) => updateData({ incidentResponseContact: e.target.value })}
          />
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Incident playbook URL"
            value={data.incidentPlaybookUrl || ''}
            onChange={(e) => updateData({ incidentPlaybookUrl: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!data.incidentNotification}
              onChange={(e) => updateData({ incidentNotification: e.target.checked })}
            />
            Contract includes incident notification clause
          </label>
        </div>
      ),
    },
  ];

  const handleComplete = (wizardData: any) => {
    const provider = wizardData.provider || {};
    const followup = wizardData.followup || {};
    const incident = wizardData.incident || {};

    onComplete({
      ...provider,
      contractSigned: true,
      concentrationRisk: false,
      subcontractingAllowed: false,
      dataProcessed: [],
      doraContractualClauses: {
        auditRights: true,
        exitStrategy: true,
        incidentNotification: !!incident.incidentNotification,
        serviceLevelAgreement: true,
        dataLocation: true,
        subContractingControls: true,
      },
      followUp: {
        owner: followup.owner || '',
        frequencyDays: followup.frequencyDays || 90,
        nextReviewDate: followup.nextReviewDate || undefined,
        status: 'ON_TRACK',
        notes: followup.notes || '',
      },
      incidentResponseContact: incident.incidentResponseContact || '',
      incidentPlaybookUrl: incident.incidentPlaybookUrl || '',
      status: 'ACTIVE',
    });
  };

  return (
    <Wizard
      title="New TPRM Provider Wizard"
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}
