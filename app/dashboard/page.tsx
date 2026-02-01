'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface PillarCompliance {
  compliancePercentage: number;
  totalControls: number;
  implementedControls: number;
  gaps: number;
  criticalGaps: number;
}

interface PillarInfo {
  id: string;
  name: string;
  nameEs?: string;
}

interface KPIData {
  regulationType: string;
  overallCompliance: number;
  pillarCompliance: Record<string, PillarCompliance>;
  estimatedMaxLoss: number;
  estimatedMaxLossFormatted: string;
  totalAssets: number;
  totalGapAnalyses: number;
  pillars?: PillarInfo[];
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  // Detect regulation from route - be very explicit about pathname detection
  const isChileanPrivacy = pathname?.includes('/chile-privacy') || pathname?.includes('/chilean-privacy');
  const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Dashboard Regulation Detection:', {
      pathname,
      isChileanPrivacy,
      regulationType,
    });
  }

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<KPIData>(`/dashboard/kpis?regulation=${regulationType}`);
      setKpis(response);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // If user has token but is on wrong dashboard route, redirect to correct one
    if (token) {
      // If user is on /dashboard but should be on Chilean Privacy dashboard
      // This should not happen if they clicked from Chilean Privacy home, but handle it anyway
      if (isChileanPrivacy && pathname === '/dashboard') {
        router.replace('/chile-privacy/dashboard');
        return;
      }
      // If user is on Chilean Privacy dashboard but shouldn't be (shouldn't happen)
      if (!isChileanPrivacy && pathname?.includes('chile-privacy/dashboard')) {
        router.replace('/dashboard');
        return;
      }
    }
    
    if (!token) {
      router.push(isChileanPrivacy ? '/chile-privacy/login' : '/login');
      return;
    }

    // In a real app, fetch user data
    setUser({ name: 'User' });
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
  }, [router, isChileanPrivacy, regulationType]);

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
    router.push(isChileanPrivacy ? '/chile-privacy' : '/');
  };

  // Get pillars from API response or use defaults
  const pillars = kpis?.pillars || (isChileanPrivacy ? [
    { id: 'LAWFULNESS_FAIRNESS', name: 'Lawfulness & Fairness', nameEs: 'Licitud y Lealtad' },
    { id: 'PURPOSE_LIMITATION', name: 'Purpose Limitation', nameEs: 'Limitación de Finalidad' },
    { id: 'DATA_MINIMIZATION', name: 'Data Minimization', nameEs: 'Minimización de Datos' },
    { id: 'PROPORTIONALITY', name: 'Proportionality', nameEs: 'Proporcionalidad' },
    { id: 'QUALITY', name: 'Quality', nameEs: 'Calidad' },
    { id: 'ACCOUNTABILITY', name: 'Accountability', nameEs: 'Responsabilidad' },
    { id: 'SECURITY', name: 'Security', nameEs: 'Seguridad' },
    { id: 'TRANSPARENCY_CONFIDENTIALITY', name: 'Transparency & Confidentiality', nameEs: 'Transparencia y Confidencialidad' },
  ] : [
    { id: 'ICT_RISK_MANAGEMENT', name: 'ICT Risk Management' },
    { id: 'INCIDENT_MANAGEMENT', name: 'ICT-Related Incident Management' },
    { id: 'RESILIENCE_TESTING', name: 'Digital Operational Resilience Testing' },
    { id: 'THIRD_PARTY_RISK', name: 'ICT Third-Party Risk Management' },
    { id: 'INFORMATION_SHARING', name: 'Information Sharing' },
  ]);

  // Format pillar for display
  const getPillarDisplay = (pillar: PillarInfo) => {
    const name = language === 'es' && pillar.nameEs ? pillar.nameEs : pillar.name;
    return { ...pillar, name };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">{isChileanPrivacy ? (language === 'es' ? 'Panel de Privacidad' : 'Privacy Dashboard') : 'Dashboard'}</h1>
        
        {loading ? (
          <div className="text-center py-8">Loading KPIs...</div>
        ) : (
          <>
            {/* Overall KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {language === 'es' ? 'Cumplimiento General' : 'Overall Compliance'}
                </h3>
                <p className={`text-3xl font-bold ${kpis ? getComplianceColor(kpis.overallCompliance) : 'text-primary-600'}`}>
                  {kpis ? `${kpis.overallCompliance}%` : '-'}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {language === 'es' ? 'Total de Activos' : 'Total Assets'}
                </h3>
                <p className="text-3xl font-bold text-primary-600">{kpis?.totalAssets || '-'}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {language === 'es' ? 'Análisis de Brechas' : 'Gap Analyses'}
                </h3>
                <p className="text-3xl font-bold text-primary-600">{kpis?.totalGapAnalyses || '-'}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-2 border-red-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {language === 'es' ? 'Pérdida Máxima Estimada' : 'Estimated Max Loss'}
                </h3>
                <p className="text-3xl font-bold text-red-600">{kpis?.estimatedMaxLossFormatted || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'es' ? 'Basado en brechas y criticidad de activos' : 'Based on gaps & asset criticality'}
                </p>
              </div>
            </div>

            {/* Compliance per Pillar */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {isChileanPrivacy 
                  ? (language === 'es' ? 'Cumplimiento por Principio' : 'Compliance by Principle')
                  : 'Compliance by DORA Pillar'}
              </h2>
              <div className={`grid grid-cols-1 md:grid-cols-2 ${isChileanPrivacy ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4`}>
                {pillars.map((pillar) => {
                  const pillarDisplay = getPillarDisplay(pillar);
                  const pillarData = kpis?.pillarCompliance[pillar.id];
                  const compliance = pillarData?.compliancePercentage || 0;
                  const hasData = pillarData && pillarData.totalControls > 0;
                  
                  return (
                    <div
                      key={pillar.id}
                      className={`p-4 rounded-lg border-2 ${
                        hasData ? getComplianceBgColor(compliance) : 'bg-gray-50'
                      } ${hasData ? 'border-gray-200' : 'border-gray-100'}`}
                    >
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        {pillarDisplay.name}
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
                            <p>{language === 'es' ? 'Controles' : 'Controls'}: {pillarData.totalControls}</p>
                            <p>{language === 'es' ? 'Brechas' : 'Gaps'}: {pillarData.gaps} {pillarData.criticalGaps > 0 && `(${pillarData.criticalGaps} ${language === 'es' ? 'críticas' : 'critical'})`}</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">{language === 'es' ? 'Sin datos disponibles' : 'No data available'}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {language === 'es' ? 'Inicio Rápido' : 'Quick Start'}
          </h2>
          <div className="space-y-4">
            <Link
              href={isChileanPrivacy ? '/chile-privacy/dashboard/questionnaire' : '/dashboard/questionnaire'}
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">
                1. {language === 'es' ? 'Completar Cuestionario' : 'Complete Questionnaire'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' ? 'Responda preguntas para identificar controles aplicables' : 'Answer questions to identify applicable controls'}
              </p>
            </Link>
            <Link
              href={isChileanPrivacy ? '/chile-privacy/dashboard/assets' : '/dashboard/assets'}
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">
                2. {language === 'es' ? 'Agregar Activos' : 'Add Your Assets'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' ? 'Catalogar activos con niveles de criticidad' : 'Catalog assets with criticality levels'}
              </p>
            </Link>
            <Link
              href={isChileanPrivacy ? '/chile-privacy/dashboard/gap-analysis' : '/dashboard/gap-analysis'}
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">
                3. {language === 'es' ? 'Ejecutar Análisis de Brechas' : 'Run Gap Analysis'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' ? 'Identificar brechas de cumplimiento' : 'Identify compliance gaps'}
              </p>
            </Link>
            <Link
              href={isChileanPrivacy ? '/chile-privacy/dashboard/remediation' : '/dashboard/remediation'}
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">
                4. {language === 'es' ? 'Ver Plan de Remediation' : 'View Remediation Plan'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' ? 'Obtener pasos accionables para lograr el cumplimiento' : 'Get actionable steps to achieve compliance'}
              </p>
            </Link>
            <Link
              href={isChileanPrivacy ? '/chile-privacy/dashboard/rule-engine' : '/dashboard/rule-engine'}
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-semibold text-lg mb-1">
                5. {language === 'es' ? 'Motor de Reglas' : 'Rule Engine'}
              </h3>
              <p className="text-gray-600">
                {language === 'es' ? 'Ver y gestionar mapeos de preguntas a requisitos' : 'View and manage question-to-requirement mappings'}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

