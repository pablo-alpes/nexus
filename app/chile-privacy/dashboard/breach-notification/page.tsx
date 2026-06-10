'use client';

/**
 * Breach Notification Page
 * Manages data breach notifications to authorities and data subjects
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import BreachNotificationWizard from '@/components/wizards/BreachNotificationWizard';

interface WorkflowStage {
  stage: 'DETECTION' | 'ASSESSMENT' | 'CONTAINMENT' | 'INVESTIGATION' | 'NOTIFICATION_PREP' | 'AUTHORITY_NOTIFICATION' | 'SUBJECT_NOTIFICATION' | 'REMEDIATION' | 'CLOSURE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  owner?: string;
  assignedDate?: string;
  completedDate?: string;
  dueDate?: string;
  notes?: string;
  documents?: string[];
}

interface BreachNotification {
  _id: string;
  breachId: string;
  incidentTitle: string;
  incidentDescription: string;
  breachDate: string;
  discoveryDate: string;
  breachType: 'CONFIDENTIALITY' | 'INTEGRITY' | 'AVAILABILITY' | 'COMBINED';
  breachCategory: string;
  affectedDataCategories: string[];
  affectedDataSubjects: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'NOTIFIED_AUTHORITY' | 'NOTIFIED_SUBJECTS' | 'RESOLVED';
  authorityNotificationRequired: boolean;
  authorityNotificationDate?: string;
  subjectNotificationRequired: boolean;
  subjectNotificationDate?: string;
  subjectsNotified?: number;
  workflowStages?: WorkflowStage[];
  currentStage?: string;
  processOwner?: string;
  escalationLevel?: 'NONE' | 'MANAGEMENT' | 'EXECUTIVE' | 'BOARD';
  containmentMeasures?: string[];
  remediationActions?: string[];
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  DETECTED: 'bg-red-100 text-red-800',
  INVESTIGATING: 'bg-yellow-100 text-yellow-800',
  CONTAINED: 'bg-blue-100 text-blue-800',
  NOTIFIED_AUTHORITY: 'bg-purple-100 text-purple-800',
  NOTIFIED_SUBJECTS: 'bg-indigo-100 text-indigo-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

export default function BreachNotificationPage() {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [breaches, setBreaches] = useState<BreachNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<BreachNotification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBreach, setEditingBreach] = useState<BreachNotification | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');

  const [formData, setFormData] = useState({
    incidentTitle: '',
    incidentDescription: '',
    breachDate: new Date().toISOString().split('T')[0],
    discoveryDate: new Date().toISOString().split('T')[0],
    breachType: 'CONFIDENTIALITY' as const,
    breachCategory: 'ACCIDENTAL',
    affectedDataCategories: [] as string[],
    affectedDataSubjects: 0,
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    containmentMeasures: [] as string[],
    remediationActions: [] as string[],
  });

  useEffect(() => {
    loadBreaches();
  }, [filterStatus, filterSeverity]);

  const loadBreaches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: regulationType });
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);
      
      const response = await apiRequest<{ breaches: BreachNotification[] }>(`/breach-notification?${params}`);
      setBreaches(response.breaches);
    } catch (error) {
      console.error('Failed to load breaches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      // Merge data from all wizard steps
      const mergedData: any = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      
      await apiRequest('/breach-notification', {
        method: 'POST',
        body: JSON.stringify({
          ...mergedData,
          affectedDataCategories: mergedData.affectedDataCategories || [],
          regulationType: regulationType,
        }),
      });
      setShowWizard(false);
      loadBreaches();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleManualCreate = async () => {
    try {
      await apiRequest('/breach-notification', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          affectedDataCategories: formData.affectedDataCategories.filter(c => c.trim() !== ''),
          regulationType: regulationType,
        }),
      });
      setShowManualForm(false);
      setFormData({
        incidentTitle: '',
        incidentDescription: '',
        breachDate: new Date().toISOString().split('T')[0],
        discoveryDate: new Date().toISOString().split('T')[0],
        breachType: 'CONFIDENTIALITY',
        breachCategory: 'ACCIDENTAL',
        affectedDataCategories: [],
        affectedDataSubjects: 0,
        severity: 'MEDIUM',
        containmentMeasures: [],
        remediationActions: [],
      });
      loadBreaches();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleStatusChange = async (breachId: string, newStatus: string) => {
    try {
      await apiRequest('/breach-notification', {
        method: 'PUT',
        body: JSON.stringify({
          breachId,
          status: newStatus,
        }),
      });
      loadBreaches();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getDaysSinceBreach = (breachDate: string): number => {
    const breach = new Date(breachDate);
    const now = new Date();
    const diff = now.getTime() - breach.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getHoursUntilDeadline = (breachDate: string): number => {
    const breach = new Date(breachDate);
    const deadline = new Date(breach);
    deadline.setHours(deadline.getHours() + 72); // 72 hours deadline
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  };

  const isOverdue = (breachDate: string): boolean => {
    return getHoursUntilDeadline(breachDate) < 0;
  };

  const handleEdit = (breach: BreachNotification) => {
    setEditingBreach(breach);
    setFormData({
      incidentTitle: breach.incidentTitle,
      incidentDescription: breach.incidentDescription,
      breachDate: new Date(breach.breachDate).toISOString().split('T')[0],
      discoveryDate: new Date(breach.discoveryDate).toISOString().split('T')[0],
      breachType: breach.breachType as any,
      breachCategory: breach.breachCategory,
      affectedDataCategories: (breach.affectedDataCategories || []) as string[],
      affectedDataSubjects: breach.affectedDataSubjects,
      severity: breach.severity,
      containmentMeasures: (breach.containmentMeasures || []) as string[],
      remediationActions: (breach.remediationActions || []) as string[],
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingBreach) return;
    try {
      await apiRequest('/breach-notification', {
        method: 'PUT',
        body: JSON.stringify({
          breachId: editingBreach.breachId,
          ...formData,
          affectedDataCategories: formData.affectedDataCategories.filter(c => c.trim() !== ''),
          businessOwner: (formData as any).businessOwner,
          regulationType: regulationType,
        }),
      });
      setShowEditModal(false);
      setEditingBreach(null);
      loadBreaches();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      DETECTED: { en: 'Detected', es: 'Detectado' },
      INVESTIGATING: { en: 'Investigating', es: 'Investigando' },
      CONTAINED: { en: 'Contained', es: 'Contenido' },
      NOTIFIED_AUTHORITY: { en: 'Notified Authority', es: 'Autoridad Notificada' },
      NOTIFIED_SUBJECTS: { en: 'Notified Subjects', es: 'Titulares Notificados' },
      RESOLVED: { en: 'Resolved', es: 'Resuelto' },
    };
    return isSpanish ? labels[status]?.es || status : labels[status]?.en || status;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      LOW: { en: 'Low', es: 'Bajo' },
      MEDIUM: { en: 'Medium', es: 'Medio' },
      HIGH: { en: 'High', es: 'Alto' },
      CRITICAL: { en: 'Critical', es: 'Crítico' },
    };
    return isSpanish ? labels[severity]?.es || severity : labels[severity]?.en || severity;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {isSpanish ? 'Notificaciones de Brechas' : 'Breach Notifications'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {isSpanish ? 'Filtrar por Severidad' : 'Filter by Severity'}
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todas' : 'All'}</option>
                {Object.keys(SEVERITY_COLORS).map(severity => (
                  <option key={severity} value={severity}>{getSeverityLabel(severity)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Breaches List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : breaches.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {isSpanish ? 'No se encontraron brechas.' : 'No breaches found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {breaches.map((breach) => {
              const hoursUntilDeadline = getHoursUntilDeadline(breach.breachDate);
              const overdue = isOverdue(breach.breachDate);
              const needsNotification = breach.authorityNotificationRequired && !breach.authorityNotificationDate;

              return (
                <div key={breach._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{breach.incidentTitle}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${SEVERITY_COLORS[breach.severity]}`}>
                          {getSeverityLabel(breach.severity)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[breach.status]}`}>
                          {getStatusLabel(breach.status)}
                        </span>
                        {needsNotification && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${overdue ? 'bg-red-200 text-red-900' : 'bg-yellow-200 text-yellow-900'}`}>
                            {overdue 
                              ? (isSpanish ? '⚠️ Vencido' : '⚠️ Overdue')
                              : (isSpanish ? `⏰ ${hoursUntilDeadline}h restantes` : `⏰ ${hoursUntilDeadline}h remaining`)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{breach.incidentDescription}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <strong>{isSpanish ? 'Fecha:' : 'Date:'}</strong> {new Date(breach.breachDate).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>{isSpanish ? 'Afectados:' : 'Affected:'}</strong> {breach.affectedDataSubjects}
                        </div>
                        <div>
                          <strong>{isSpanish ? 'Tipo:' : 'Type:'}</strong> {breach.breachType}
                        </div>
                        {breach.authorityNotificationDate && (
                          <div>
                            <strong>{isSpanish ? 'Notificado:' : 'Notified:'}</strong> {new Date(breach.authorityNotificationDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {/* Workflow Status - Always visible unless resolved */}
                      {breach.status !== 'RESOLVED' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <strong className="text-gray-700">{isSpanish ? 'Etapa Actual:' : 'Current Stage:'}</strong>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              breach.currentStage === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                              breach.currentStage === 'NOTIFIED_SUBJECTS' ? 'bg-blue-100 text-blue-800' :
                              breach.currentStage === 'NOTIFIED_AUTHORITY' ? 'bg-purple-100 text-purple-800' :
                              breach.currentStage === 'INVESTIGATING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {breach.currentStage || (breach.workflowStages && breach.workflowStages[breach.workflowStages.length - 1]?.stage) || 'DETECTED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            {breach.processOwner && (
                              <span>
                                {isSpanish ? 'Process Owner:' : 'Process Owner:'} {breach.processOwner}
                              </span>
                            )}
                            {(breach as any).businessOwner && (
                              <span>
                                {isSpanish ? 'Business Owner:' : 'Business Owner:'} {(breach as any).businessOwner}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <select
                        value={breach.status}
                        onChange={(e) => handleStatusChange(breach.breachId, e.target.value)}
                        className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[breach.status]} border-0`}
                      >
                        {Object.keys(STATUS_COLORS).map(status => (
                          <option key={status} value={status}>{getStatusLabel(status)}</option>
                        ))}
                      </select>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setSelectedBreach(breach);
                            setShowDetailsModal(true);
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                        >
                          {isSpanish ? 'Ver Detalles' : 'View Details'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBreach(breach);
                            setShowEditModal(true);
                          }}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                        >
                          {isSpanish ? '✏️ Editar' : '✏️ Edit'}
                        </button>
                      </div>
                      {breach.workflowStages && breach.workflowStages.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedBreach(breach);
                            setShowWorkflowModal(true);
                          }}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200"
                        >
                          {isSpanish ? '📋 Workflow' : '📋 Workflow'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Wizard */}
        {showWizard && (
          <BreachNotificationWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}

        {/* Manual Form - Simplified */}
        {showManualForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Nueva Brecha de Datos (Manual)' : 'New Data Breach (Manual)'}
                  </h2>
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  {isSpanish
                    ? 'El formulario manual está en desarrollo. Por favor use el asistente (Wizard) para una mejor experiencia.'
                    : 'Manual form is under development. Please use the Wizard for a better experience.'}
                </p>
                <button
                  onClick={() => {
                    setShowManualForm(false);
                    setShowWizard(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isSpanish ? 'Usar Asistente' : 'Use Wizard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Form - Placeholder */}
        {showManualForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Nueva Brecha de Datos' : 'New Data Breach'}
                  </h2>
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Título del Incidente' : 'Incident Title'} *
                    </label>
                    <input
                      type="text"
                      value={formData.incidentTitle}
                      onChange={(e) => setFormData({ ...formData, incidentTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Descripción' : 'Description'} *
                    </label>
                    <textarea
                      value={formData.incidentDescription}
                      onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Fecha de Brecha' : 'Breach Date'} *
                      </label>
                      <input
                        type="date"
                        value={formData.breachDate}
                        onChange={(e) => setFormData({ ...formData, breachDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Fecha de Descubrimiento' : 'Discovery Date'} *
                      </label>
                      <input
                        type="date"
                        value={formData.discoveryDate}
                        onChange={(e) => setFormData({ ...formData, discoveryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Tipo de Brecha' : 'Breach Type'} *
                      </label>
                      <select
                        value={formData.breachType}
                        onChange={(e) => setFormData({ ...formData, breachType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="CONFIDENTIALITY">{isSpanish ? 'Confidencialidad' : 'Confidentiality'}</option>
                        <option value="INTEGRITY">{isSpanish ? 'Integridad' : 'Integrity'}</option>
                        <option value="AVAILABILITY">{isSpanish ? 'Disponibilidad' : 'Availability'}</option>
                        <option value="COMBINED">{isSpanish ? 'Combinado' : 'Combined'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Severidad' : 'Severity'} *
                      </label>
                      <select
                        value={formData.severity}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="LOW">{getSeverityLabel('LOW')}</option>
                        <option value="MEDIUM">{getSeverityLabel('MEDIUM')}</option>
                        <option value="HIGH">{getSeverityLabel('HIGH')}</option>
                        <option value="CRITICAL">{getSeverityLabel('CRITICAL')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Sujetos Afectados' : 'Affected Data Subjects'} *
                    </label>
                    <input
                      type="number"
                      value={formData.affectedDataSubjects}
                      onChange={(e) => setFormData({ ...formData, affectedDataSubjects: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      min="0"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowWizard(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleManualCreate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isSpanish ? 'Crear Brecha' : 'Create Breach'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedBreach && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">{selectedBreach.incidentTitle}</h2>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedBreach(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <p><strong>{isSpanish ? 'Descripción:' : 'Description:'}</strong> {selectedBreach.incidentDescription}</p>
                  <p><strong>{isSpanish ? 'Fecha:' : 'Date:'}</strong> {new Date(selectedBreach.breachDate).toLocaleDateString()}</p>
                  <p><strong>{isSpanish ? 'Severidad:' : 'Severity:'}</strong> {getSeverityLabel(selectedBreach.severity)}</p>
                  <p><strong>{isSpanish ? 'Afectados:' : 'Affected:'}</strong> {selectedBreach.affectedDataSubjects}</p>
                  {selectedBreach.processOwner && (
                    <p><strong>{isSpanish ? 'Responsable del Proceso:' : 'Process Owner:'}</strong> {selectedBreach.processOwner}</p>
                  )}
                  {selectedBreach.authorityNotificationRequired && (
                    <p className={selectedBreach.authorityNotificationDate ? 'text-green-600' : 'text-red-600'}>
                      <strong>{isSpanish ? 'Notificación a Autoridad:' : 'Authority Notification:'}</strong> {
                        selectedBreach.authorityNotificationDate 
                          ? new Date(selectedBreach.authorityNotificationDate).toLocaleDateString()
                          : (isSpanish ? 'Pendiente' : 'Pending')
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Modal - Process Follow-up */}
        {showWorkflowModal && selectedBreach && selectedBreach.workflowStages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Workflow de Brecha' : 'Breach Workflow'} - {selectedBreach.incidentTitle}
                  </h2>
                  <button
                    onClick={() => {
                      setShowWorkflowModal(false);
                      setSelectedBreach(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {selectedBreach.processOwner && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">
                      <strong>{isSpanish ? 'Responsable del Proceso:' : 'Process Owner:'}</strong> {selectedBreach.processOwner}
                    </p>
                  </div>
                )}

                {/* Workflow Stages */}
                <div className="space-y-3">
                  {selectedBreach.workflowStages.map((stage, index) => {
                    const stageLabels: Record<string, { en: string; es: string }> = {
                      DETECTION: { en: 'Detection', es: 'Detección' },
                      ASSESSMENT: { en: 'Assessment', es: 'Evaluación' },
                      CONTAINMENT: { en: 'Containment', es: 'Contención' },
                      INVESTIGATION: { en: 'Investigation', es: 'Investigación' },
                      NOTIFICATION_PREP: { en: 'Notification Prep', es: 'Preparación Notificación' },
                      AUTHORITY_NOTIFICATION: { en: 'Authority Notification', es: 'Notificación Autoridad' },
                      SUBJECT_NOTIFICATION: { en: 'Subject Notification', es: 'Notificación Titulares' },
                      REMEDIATION: { en: 'Remediation', es: 'Remediación' },
                      CLOSURE: { en: 'Closure', es: 'Cierre' },
                    };

                    const statusColors: Record<string, string> = {
                      PENDING: 'bg-gray-100 text-gray-800',
                      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
                      COMPLETED: 'bg-green-100 text-green-800',
                      BLOCKED: 'bg-red-100 text-red-800',
                    };

                    const statusLabels: Record<string, { en: string; es: string }> = {
                      PENDING: { en: 'Pending', es: 'Pendiente' },
                      IN_PROGRESS: { en: 'In Progress', es: 'En Progreso' },
                      COMPLETED: { en: 'Completed', es: 'Completado' },
                      BLOCKED: { en: 'Blocked', es: 'Bloqueado' },
                    };

                    const isOverdue = stage.dueDate && new Date(stage.dueDate) < new Date() && stage.status !== 'COMPLETED';
                    const isCurrent = selectedBreach.currentStage === stage.stage;

                    return (
                      <div
                        key={index}
                        className={`p-4 border-2 rounded-lg ${
                          isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              stage.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                              stage.status === 'IN_PROGRESS' ? 'bg-yellow-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {stage.status === 'COMPLETED' ? '✓' : index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {isSpanish ? stageLabels[stage.stage]?.es : stageLabels[stage.stage]?.en}
                              </h3>
                              {isCurrent && (
                                <span className="text-xs text-blue-600 font-medium">
                                  {isSpanish ? '← Etapa Actual' : '← Current Stage'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[stage.status]}`}>
                              {isSpanish ? statusLabels[stage.status]?.es : statusLabels[stage.status]?.en}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-200 text-red-900">
                                {isSpanish ? '⚠️ Vencido' : '⚠️ Overdue'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                          {stage.owner && (
                            <div>
                              <strong>{isSpanish ? 'Responsable:' : 'Owner:'}</strong> {stage.owner}
                            </div>
                          )}
                          {stage.dueDate && (
                            <div>
                              <strong>{isSpanish ? 'Fecha Límite:' : 'Due Date:'}</strong> {new Date(stage.dueDate).toLocaleDateString()}
                            </div>
                          )}
                          {stage.assignedDate && (
                            <div>
                              <strong>{isSpanish ? 'Asignado:' : 'Assigned:'}</strong> {new Date(stage.assignedDate).toLocaleDateString()}
                            </div>
                          )}
                          {stage.completedDate && (
                            <div>
                              <strong>{isSpanish ? 'Completado:' : 'Completed:'}</strong> {new Date(stage.completedDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {stage.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>{isSpanish ? 'Notas:' : 'Notes:'}</strong> {stage.notes}
                          </div>
                        )}
                        {stage.status !== 'COMPLETED' && (
                          <button
                            onClick={async () => {
                              try {
                                await apiRequest('/breach-notification', {
                                  method: 'PUT',
                                  body: JSON.stringify({
                                    breachId: selectedBreach.breachId,
                                    workflowStageUpdate: {
                                      stage: stage.stage,
                                      status: stage.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
                                    },
                                  }),
                                });
                                loadBreaches();
                                setShowWorkflowModal(false);
                                setSelectedBreach(null);
                              } catch (error: any) {
                                alert(`Error: ${error.message}`);
                              }
                            }}
                            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            {stage.status === 'PENDING'
                              ? (isSpanish ? 'Iniciar Etapa' : 'Start Stage')
                              : (isSpanish ? 'Completar Etapa' : 'Complete Stage')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingBreach && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Editar Brecha de Datos' : 'Edit Data Breach'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingBreach(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Título del Incidente' : 'Incident Title'} *
                    </label>
                    <input
                      type="text"
                      value={formData.incidentTitle}
                      onChange={(e) => setFormData({ ...formData, incidentTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Descripción' : 'Description'} *
                    </label>
                    <textarea
                      value={formData.incidentDescription}
                      onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Fecha de Brecha' : 'Breach Date'} *
                      </label>
                      <input
                        type="date"
                        value={formData.breachDate}
                        onChange={(e) => setFormData({ ...formData, breachDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Fecha de Descubrimiento' : 'Discovery Date'} *
                      </label>
                      <input
                        type="date"
                        value={formData.discoveryDate}
                        onChange={(e) => setFormData({ ...formData, discoveryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Business Owner' : 'Business Owner'}
                    </label>
                    <input
                      type="text"
                      value={(formData as any).businessOwner || ''}
                      onChange={(e) => setFormData({ ...formData, businessOwner: e.target.value } as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={isSpanish ? 'Nombre del Business Owner' : 'Business Owner Name'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Evidencias' : 'Evidence'}
                    </label>
                    <div className="border border-gray-300 rounded-md p-4">
                      {(editingBreach as any).evidence && (editingBreach as any).evidence.length > 0 ? (
                        <div className="space-y-2">
                          {(editingBreach as any).evidence.map((ev: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <span className="text-sm">{ev.fileName}</span>
                              <a
                                href={`/api/evidence/${ev.evidenceId}`}
                                target="_blank"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                {isSpanish ? 'Descargar' : 'Download'}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{isSpanish ? 'No hay evidencias' : 'No evidence'}</p>
                      )}
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Handle file upload - would need to implement API endpoint
                            console.log('File selected:', file.name);
                          }
                        }}
                        className="mt-2 text-sm"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingBreach(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isSpanish ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
