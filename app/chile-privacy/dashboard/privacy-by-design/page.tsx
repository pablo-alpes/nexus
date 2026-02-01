'use client';

/**
 * Privacy by Design Projects Page
 * Manages projects with privacy considerations and DPIA requirements
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import PrivacyByDesignProjectWizard from '@/components/wizards/PrivacyByDesignProjectWizard';

interface PrivacyByDesignProject {
  _id: string;
  projectId: string;
  projectName: string;
  description: string;
  projectType: string;
  status: string;
  startDate: string;
  expectedCompletionDate?: string;
  projectOwner: string;
  businessUnit: string;
  dpiaRequired: boolean;
  dpiaStatus?: string;
  dpiaId?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataCategories: string[];
  dataSubjectCategories: string[];
  privacyControls: Array<{
    controlId: string;
    controlName: string;
    implementationStatus: string;
    responsible: string;
  }>;
  committeeDecisions: Array<{
    decisionId: string;
    decisionDate: string;
    committee: string;
    decision: string;
    approvedBy: string;
  }>;
  complianceStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DPIA_REQUIRED: 'bg-yellow-100 text-yellow-800',
  DPIA_IN_PROGRESS: 'bg-orange-100 text-orange-800',
  DPIA_APPROVED: 'bg-green-100 text-green-800',
  DPIA_REJECTED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default function PrivacyByDesignPage() {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [projects, setProjects] = useState<PrivacyByDesignProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDPIA, setFilterDPIA] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('');

  useEffect(() => {
    loadProjects();
  }, [filterStatus, filterDPIA, filterRisk]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: regulationType });
      if (filterStatus) params.append('status', filterStatus);
      if (filterDPIA) params.append('dpiaRequired', filterDPIA);
      if (filterRisk) params.append('riskLevel', filterRisk);
      
      const response = await apiRequest<{ projects: PrivacyByDesignProject[] }>(`/privacy-by-design-projects?${params}`);
      setProjects(response.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      // Merge data from all wizard steps
      const mergedData: any = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      
      await apiRequest('/privacy-by-design-projects', {
        method: 'POST',
        body: JSON.stringify({
          ...mergedData,
          regulationType: regulationType,
        }),
      });
      setShowWizard(false);
      loadProjects();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      PLANNING: { en: 'Planning', es: 'Planificación' },
      IN_PROGRESS: { en: 'In Progress', es: 'En Progreso' },
      DPIA_REQUIRED: { en: 'DPIA Required', es: 'DPIA Requerido' },
      DPIA_IN_PROGRESS: { en: 'DPIA In Progress', es: 'DPIA En Progreso' },
      DPIA_APPROVED: { en: 'DPIA Approved', es: 'DPIA Aprobado' },
      DPIA_REJECTED: { en: 'DPIA Rejected', es: 'DPIA Rechazado' },
      COMPLETED: { en: 'Completed', es: 'Completado' },
      CANCELLED: { en: 'Cancelled', es: 'Cancelado' },
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

  const getProjectTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      NEW_SYSTEM: { en: 'New System', es: 'Nuevo Sistema' },
      SYSTEM_UPDATE: { en: 'System Update', es: 'Actualización de Sistema' },
      DATA_PROCESSING: { en: 'Data Processing', es: 'Procesamiento de Datos' },
      THIRD_PARTY_INTEGRATION: { en: 'Third Party Integration', es: 'Integración con Terceros' },
      OTHER: { en: 'Other', es: 'Otro' },
    };
    return isSpanish ? labels[type]?.es || type : labels[type]?.en || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {isSpanish ? 'Privacy by Design - Proyectos' : 'Privacy by Design Projects'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isSpanish
                ? 'Gestión de proyectos con consideraciones de privacidad y requisitos de DPIA'
                : 'Manage projects with privacy considerations and DPIA requirements'}
            </p>
          </div>
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
                {Object.keys(STATUS_COLORS).map(status => (
                  <option key={status} value={status}>{getStatusLabel(status)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Filtrar por DPIA' : 'Filter by DPIA'}
              </label>
              <select
                value={filterDPIA}
                onChange={(e) => setFilterDPIA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todos' : 'All'}</option>
                <option value="true">{isSpanish ? 'DPIA Requerido' : 'DPIA Required'}</option>
                <option value="false">{isSpanish ? 'Sin DPIA' : 'No DPIA'}</option>
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

        {/* Projects List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {isSpanish ? 'No se encontraron proyectos.' : 'No projects found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{project.projectName}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                        {getStatusLabel(project.status)}
                      </span>
                      {project.riskLevel && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${RISK_COLORS[project.riskLevel]}`}>
                          {getRiskLabel(project.riskLevel)}
                        </span>
                      )}
                      {project.dpiaRequired && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {isSpanish ? 'DPIA' : 'DPIA'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-2">{project.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <strong>{isSpanish ? 'Tipo:' : 'Type:'}</strong> {getProjectTypeLabel(project.projectType)}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Responsable:' : 'Owner:'}</strong> {project.projectOwner}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Unidad:' : 'Business Unit:'}</strong> {project.businessUnit}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Controles:' : 'Controls:'}</strong> {project.privacyControls.length}
                      </div>
                    </div>
                    {project.dpiaRequired && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">
                          <strong>{isSpanish ? 'Estado DPIA:' : 'DPIA Status:'}</strong> {project.dpiaStatus || (isSpanish ? 'No iniciado' : 'Not started')}
                        </span>
                      </div>
                    )}
                    {project.committeeDecisions.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>{isSpanish ? 'Decisiones del Comité:' : 'Committee Decisions:'}</strong> {project.committeeDecisions.length}
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
          <PrivacyByDesignProjectWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}

        {/* Manual Form - Placeholder */}
        {showManualForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {isSpanish ? 'Nuevo Proyecto (Manual)' : 'New Project (Manual)'}
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
