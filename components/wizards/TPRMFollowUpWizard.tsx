'use client';

import Wizard from '../Wizard';

interface TPRMFollowUpWizardProps {
  provider: any;
  onComplete: (payload: any) => void;
  onCancel: () => void;
}

export default function TPRMFollowUpWizard({ provider, onComplete, onCancel }: TPRMFollowUpWizardProps) {
  const steps = [
    {
      id: 'status',
      title: 'Follow-up Status',
      description: `Update follow-up for ${provider?.name || 'provider'}.`,
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Follow-up owner"
            value={data.owner || provider?.followUp?.owner || ''}
            onChange={(e) => updateData({ owner: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="w-full px-3 py-2 border rounded"
              value={data.status || provider?.followUp?.status || 'ON_TRACK'}
              onChange={(e) => updateData({ status: e.target.value })}
            >
              <option value="ON_TRACK">On Track</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <input
              type="number"
              min={7}
              className="w-full px-3 py-2 border rounded"
              placeholder="Frequency days"
              value={data.frequencyDays || provider?.followUp?.frequencyDays || 90}
              onChange={(e) => updateData({ frequencyDays: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={data.lastReviewDate || ''}
              onChange={(e) => updateData({ lastReviewDate: e.target.value })}
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
            rows={4}
            placeholder="Follow-up notes"
            value={data.notes || ''}
            onChange={(e) => updateData({ notes: e.target.value })}
          />
        </div>
      ),
    },
    {
      id: 'incident',
      title: 'Incident Follow-up',
      description: 'Log incident summary if this follow-up is incident-driven.',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <select
            className="w-full px-3 py-2 border rounded"
            value={data.severity || 'MEDIUM'}
            onChange={(e) => updateData({ severity: e.target.value })}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <textarea
            className="w-full px-3 py-2 border rounded"
            rows={3}
            placeholder="Incident summary (optional)"
            value={data.summary || ''}
            onChange={(e) => updateData({ summary: e.target.value })}
          />
          <textarea
            className="w-full px-3 py-2 border rounded"
            rows={3}
            placeholder="Actions taken (one per line)"
            value={(data.actionsTaken || []).join('\n')}
            onChange={(e) =>
              updateData({
                actionsTaken: e.target.value
                  .split('\n')
                  .map((s: string) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      ),
    },
  ];

  const handleComplete = (wizardData: any) => {
    const status = wizardData.status || {};
    const incident = wizardData.incident || {};
    const payload: any = {
      providerId: provider.providerId || provider._id,
      followUp: {
        owner: status.owner || provider?.followUp?.owner || '',
        status: status.status || provider?.followUp?.status || 'ON_TRACK',
        frequencyDays: status.frequencyDays || provider?.followUp?.frequencyDays || 90,
        lastReviewDate: status.lastReviewDate || new Date().toISOString(),
        nextReviewDate: status.nextReviewDate || provider?.followUp?.nextReviewDate || undefined,
        notes: status.notes || '',
      },
      complianceStatus:
        (status.status === 'OVERDUE' ? 'UNDER_REVIEW' : provider.complianceStatus) || 'UNDER_REVIEW',
    };

    if (incident.summary) {
      payload.incidentLog = [
        ...(provider.incidentLog || []),
        {
          createdAt: new Date().toISOString(),
          severity: incident.severity || 'MEDIUM',
          summary: incident.summary,
          actionsTaken: incident.actionsTaken || [],
        },
      ];
    }

    onComplete(payload);
  };

  return (
    <Wizard
      title="TPRM Follow-up Wizard"
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}
