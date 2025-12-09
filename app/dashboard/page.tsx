'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import UserContextBar from '@/components/UserContextBar';
import DashboardNav from '@/components/DashboardNav';

const DORA_PILLARS = [
  { value: 'ICT_RISK_MANAGEMENT', label: 'ICT Risk Management', short: 'Risk Mgmt' },
  { value: 'INCIDENT_MANAGEMENT', label: 'ICT-Related Incident Management', short: 'Incident Mgmt' },
  { value: 'RESILIENCE_TESTING', label: 'Digital Operational Resilience Testing', short: 'Resilience Testing' },
  { value: 'THIRD_PARTY_RISK', label: 'ICT Third-Party Risk Management', short: 'Third-Party Risk' },
  { value: 'INFORMATION_SHARING', label: 'Information Sharing', short: 'Info Sharing' },
];

interface PillarCompliance {
  compliancePercentage: number;
  totalControls: number;
  implementedControls: number;
  gaps: number;
  criticalGaps: number;
}

interface KPIData {
  overallCompliance: number;
  pillarCompliance: Record<string, PillarCompliance>;
  estimatedMaxLoss: number;
  estimatedMaxLossFormatted: string;
  totalAssets: number;
  totalGapAnalyses: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user data
    const loadUser = async () => {
      try {
        const userRes = await apiRequest<{ user: any }>('/auth/me');
        if (userRes?.user) {
          setUser(userRes.user);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };

    loadUser();
    loadKPIs();
    
    // Refresh KPIs when page becomes visible (e.g., returning from remediation page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadKPIs();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh on focus (when user switches back to tab)
    const handleFocus = () => {
      loadKPIs();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<KPIData>('/dashboard/kpis');
      setKpis(response);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getComplianceBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50';
    if (percentage >= 60) return 'bg-yellow-50';
    if (percentage >= 40) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={user} />
      
      {/* Logout button in a separate bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end py-2">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-700 hover:text-primary-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {loading ? (
          <div className="text-center py-8">Loading KPIs...</div>
        ) : (
          <>
            {/* Overall KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Compliance</h3>
                <p className={`text-3xl font-bold ${kpis ? getComplianceColor(kpis.overallCompliance) : 'text-primary-600'}`}>
                  {kpis ? `${kpis.overallCompliance}%` : '-'}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Assets</h3>
                <p className="text-3xl font-bold text-primary-600">{kpis?.totalAssets || '-'}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Gap Analyses</h3>
                <p className="text-3xl font-bold text-primary-600">{kpis?.totalGapAnalyses || '-'}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-2 border-red-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Estimated Max Loss</h3>
                <p className="text-3xl font-bold text-red-600">{kpis?.estimatedMaxLossFormatted || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">Based on gaps & asset criticality</p>
              </div>
            </div>

            {/* Compliance per Pillar */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Compliance by DORA Pillar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {DORA_PILLARS.map((pillar) => {
                  const pillarData = kpis?.pillarCompliance[pillar.value];
                  const compliance = pillarData?.compliancePercentage || 0;
                  const hasData = pillarData && pillarData.totalControls > 0;
                  
                  return (
                    <div
                      key={pillar.value}
                      className={`p-4 rounded-lg border-2 ${
                        hasData ? getComplianceBgColor(compliance) : 'bg-gray-50'
                      } ${hasData ? 'border-gray-200' : 'border-gray-100'}`}
                    >
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        {pillar.short}
                      </h3>
                      {hasData ? (
                        <>
                          <div className="flex items-baseline mb-2">
                            <p className={`text-2xl font-bold ${getComplianceColor(compliance)}`}>
                              {compliance}%
                            </p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                compliance >= 80 ? 'bg-green-500' :
                                compliance >= 60 ? 'bg-yellow-500' :
                                compliance >= 40 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${compliance}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>Controls: {pillarData.totalControls}</p>
                            <p>Gaps: {pillarData.gaps} {pillarData.criticalGaps > 0 && `(${pillarData.criticalGaps} critical)`}</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">No data available</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
          <div className="space-y-4">
            <Link
              href="/dashboard/questionnaire"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">1. Complete Questionnaire</h3>
              <p className="text-gray-600">Answer questions to identify applicable controls</p>
            </Link>
            <Link
              href="/dashboard/assets"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">2. Add Your Assets</h3>
              <p className="text-gray-600">Catalog assets with criticality levels</p>
            </Link>
            <Link
              href="/dashboard/gap-analysis"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">3. Run Gap Analysis</h3>
              <p className="text-gray-600">Identify compliance gaps</p>
            </Link>
            <Link
              href="/dashboard/remediation"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">4. View Remediation Plan</h3>
              <p className="text-gray-600">Get actionable steps to achieve compliance</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

