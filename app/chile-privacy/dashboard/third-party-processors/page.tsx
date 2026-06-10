'use client';

/**
 * Third Party Processors Page
 * Manages third-party data processors (GDPR Article 28)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import ThirdPartyProcessorWizard from '@/components/wizards/ThirdPartyProcessorWizard';

interface ThirdPartyProcessor {
  _id: string;
  processorId: string;
  name: string;
  companyName: string;
  contactEmail: string;
  country: string;
  processorType: string;
  servicesProvided: string[];
  dataCategoriesProcessed: string[];
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'PENDING_ASSESSMENT';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contractSigned: boolean;
  dpaSigned: boolean;
  sccSigned: boolean;
  transfersToThirdCountries: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  certifications: Array<{ type: string; issueDate: string; expiryDate?: string }>;
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

export default function ThirdPartyProcessorsPage() {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [processors, setProcessors] = useState<ThirdPartyProcessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProcessor, setEditingProcessor] = useState<ThirdPartyProcessor | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCompliance, setFilterCompliance] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('');

  useEffect(() => {
    loadProcessors();
  }, [filterStatus, filterCompliance, filterRisk]);

  const loadProcessors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: regulationType });
      if (filterStatus) params.append('status', filterStatus);
      if (filterCompliance) params.append('complianceStatus', filterCompliance);
      if (filterRisk) params.append('riskLevel', filterRisk);
      
      const response = await apiRequest<{ processors: ThirdPartyProcessor[] }>(`/third-party-processors?${params}`);
      setProcessors(response.processors);
    } catch (error) {
      console.error('Failed to load processors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      // Merge data from all wizard steps
      const mergedData = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      
      await apiRequest('/third-party-processors', {
        method: 'POST',
        body: JSON.stringify({
          ...(mergedData as Record<string, unknown>),
          regulation: regulationType,
        }),
      });
      setShowWizard(false);
      loadProcessors();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      ACTIVE: { en: 'Active', es: 'Activo' },
      INACTIVE: { en: 'Inactive', es: 'Inactivo' },
      SUSPENDED: { en: 'Suspended', es: 'Suspendido' },
      TERMINATED: { en: 'Terminated', es: 'Terminado' },
    };
    return isSpanish ? labels[status]?.es || status : labels[status]?.en || status;
  };

  const getComplianceLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      COMPLIANT: { en: 'Compliant', es: 'Cumpliente' },
      NON_COMPLIANT: { en: 'Non-Compliant', es: 'No Cumpliente' },
      UNDER_REVIEW: { en: 'Under Review', es: 'En Revisión' },
      PENDING_ASSESSMENT: { en: 'Pending Assessment', es: 'Evaluación Pendiente' },
    };
    return isSpanish ? labels[status]?.es || status : labels[status]?.en || status;
  };

  const getRiskLabel = (risk: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      LOW: { en: 'Low', es: 'Bajo' },
      MEDIUM: { en: 'Medium', es: 'Medio' },
      HIGH: { en: 'High', es: 'Alto' },
      CRITICAL: { en: 'Critical', es: 'Crítico' },
    };
    return isSpanish ? labels[risk]?.es || risk : labels[risk]?.en || risk;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {isSpanish ? 'Gestión de Procesadores de Terceros' : 'Third Party Processors'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isSpanish ? '🧙 Asistente' : '🧙 Wizard'}
            </button>
            <button
              onClick={() => setShowManualForm(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {isSpanish ? '✏️ Manual' : '✏️ Manual'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Filtrar por Estado' : 'Filter by Status'}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todos' : 'All'}</option>
                {Object.keys({ ACTIVE: '', INACTIVE: '', SUSPENDED: '', TERMINATED: '' }).map(status => (
                  <option key={status} value={status}>{getStatusLabel(status)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Filtrar por Cumplimiento' : 'Filter by Compliance'}
              </label>
              <select
                value={filterCompliance}
                onChange={(e) => setFilterCompliance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todos' : 'All'}</option>
                {Object.keys(COMPLIANCE_COLORS).map(status => (
                  <option key={status} value={status}>{getComplianceLabel(status)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Filtrar por Riesgo' : 'Filter by Risk'}
              </label>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todos' : 'All'}</option>
                {Object.keys(RISK_COLORS).map(risk => (
                  <option key={risk} value={risk}>{getRiskLabel(risk)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Processors List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : processors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {isSpanish ? 'No se encontraron procesadores.' : 'No processors found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {processors.map((processor) => (
              <div key={processor._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{processor.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${RISK_COLORS[processor.riskLevel]}`}>
                        {getRiskLabel(processor.riskLevel)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${COMPLIANCE_COLORS[processor.complianceStatus]}`}>
                        {getComplianceLabel(processor.complianceStatus)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{processor.companyName} - {processor.country}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <strong>{isSpanish ? 'Tipo:' : 'Type:'}</strong> {processor.processorType}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Servicios:' : 'Services:'}</strong> {processor.servicesProvided.length}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'DPA:' : 'DPA:'}</strong> {processor.dpaSigned ? '✓' : '✗'}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Transferencias:' : 'Transfers:'}</strong> {processor.transfersToThirdCountries ? '✓' : '✗'}
                      </div>
                    </div>
                    {processor.certifications && processor.certifications.length > 0 && (
                      <div className="text-sm text-gray-500">
                        <strong>{isSpanish ? 'Certificaciones:' : 'Certifications:'}</strong> {processor.certifications.map((c: any) => c.type).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wizard */}
        {showWizard && (
          <ThirdPartyProcessorWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}

        {/* Manual Form - Placeholder for now */}
        {showManualForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {isSpanish ? 'Nuevo Procesador (Manual)' : 'New Processor (Manual)'}
                </h2>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600">
                {isSpanish
                  ? 'El formulario manual está en desarrollo. Por favor use el asistente (Wizard) por ahora.'
                  : 'Manual form is under development. Please use the Wizard for now.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
