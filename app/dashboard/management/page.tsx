'use client';

import Link from 'next/link';

const modules = [
  {
    id: 'ICT_RISK_MANAGEMENT',
    title: 'ICT Risk Management',
    description: 'Governance, requirements, and controls management for ICT risk.',
    href: '/dashboard/requirements',
  },
  {
    id: 'INCIDENT_MANAGEMENT',
    title: 'Incident Management',
    description: 'Manage incident-related gaps, controls, and remediation actions.',
    href: '/dashboard/gap-analysis?pillar=INCIDENT_MANAGEMENT',
  },
  {
    id: 'RESILIENCE_TESTING',
    title: 'Resilience Testing Management',
    description: 'Track testing readiness, resilience gaps, and related controls.',
    href: '/dashboard/gap-analysis?pillar=RESILIENCE_TESTING',
  },
  {
    id: 'THIRD_PARTY_RISK',
    title: 'Third-Party Management',
    description: 'Manage ICT third-party providers, contractual clauses, and concentration risk.',
    href: '/dashboard/tprm',
  },
  {
    id: 'INFORMATION_SHARING',
    title: 'Information Sharing Management',
    description: 'Manage threat-sharing obligations, controls, and evidence readiness.',
    href: '/dashboard/gap-analysis?pillar=INFORMATION_SHARING',
  },
];

export default function ManagementHubPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">Pillar Management Hub</h1>
        <p className="text-gray-600 mb-8">
          Central management view for all DORA pillars. Use each module to monitor controls, gaps, and remediation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => (
            <div key={module.id} className="bg-white rounded-lg shadow p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-2">{module.title}</h2>
              <p className="text-gray-600 mb-4">{module.description}</p>
              <Link
                href={module.href}
                className="inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
              >
                Open Management
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
