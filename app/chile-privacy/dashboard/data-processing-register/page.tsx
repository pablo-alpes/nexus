'use client';

/**
 * Data Processing Register Page
 * Records of Processing Activities (ROPA)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';
import DataProcessingRegisterWizard from '@/components/wizards/DataProcessingRegisterWizard';
import DataPurgeWizard from '@/components/wizards/DataPurgeWizard';

interface ProcessingActivity {
  _id: string;
  activityId: string;
  activityName: string;
  description: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjectCategories: string[];
  retentionPeriod: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  consentRequired: boolean;
  consentCount: number;
  pillar?: string;
}

const LEGAL_BASIS_OPTIONS = [
  { value: 'CONSENT', label: 'Consent', labelEs: 'Consentimiento' },
  { value: 'CONTRACT', label: 'Contract', labelEs: 'Contrato' },
  { value: 'LEGAL_OBLIGATION', label: 'Legal Obligation', labelEs: 'Obligación Legal' },
  { value: 'VITAL_INTERESTS', label: 'Vital Interests', labelEs: 'Intereses Vitales' },
  { value: 'PUBLIC_TASK', label: 'Public Task', labelEs: 'Tarea Pública' },
  { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate Interests', labelEs: 'Intereses Legítimos' },
];

export default function DataProcessingRegisterPage() {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;
  const config = getRegulationConfig(regulationType);

  const [activities, setActivities] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ProcessingActivity | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ProcessingActivity | null>(null);
  const [activeTab, setActiveTab] = useState<'activities' | 'purges'>('activities');
  const [showPurgeWizard, setShowPurgeWizard] = useState(false);
  const [selectedActivityForPurge, setSelectedActivityForPurge] = useState<ProcessingActivity | null>(null);
  const [purges, setPurges] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPillar, setFilterPillar] = useState<string>('');

  const [formData, setFormData] = useState({
    activityName: '',
    description: '',
    purpose: '',
    legalBasis: 'CONSENT',
    dataCategories: [] as string[],
    dataSubjectCategories: [] as string[],
    retentionPeriod: '',
    consentRequired: false,
    pillar: '',
  });

  useEffect(() => {
    loadActivities();
  }, [filterStatus, filterPillar]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: regulationType });
      if (filterStatus) params.append('status', filterStatus);
      if (filterPillar) params.append('pillar', filterPillar);
      
      const response = await apiRequest<{ activities: ProcessingActivity[] }>(`/data-processing-register?${params}`);
      setActivities(response.activities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      const mergedData: any = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      await apiRequest('/data-processing-register', {
        method: 'POST',
        body: JSON.stringify({
          ...mergedData,
          regulationType: regulationType,
        }),
      });
      setShowWizard(false);
      loadActivities();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCreate = async () => {
    try {
      await apiRequest('/data-processing-register', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          dataCategories: formData.dataCategories.filter(c => c.trim() !== ''),
          dataSubjectCategories: formData.dataSubjectCategories.filter(c => c.trim() !== ''),
          regulationType: regulationType,
        }),
      });
      setShowCreateModal(false);
      setFormData({
        activityName: '',
        description: '',
        purpose: '',
        legalBasis: 'CONSENT',
        dataCategories: [],
        dataSubjectCategories: [],
        retentionPeriod: '',
        consentRequired: false,
        pillar: '',
      });
      loadActivities();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      ACTIVE: { en: 'Active', es: 'Activo' },
      INACTIVE: { en: 'Inactive', es: 'Inactivo' },
      UNDER_REVIEW: { en: 'Under Review', es: 'En Revisión' },
    };
    return isSpanish ? labels[status]?.es || status : labels[status]?.en || status;
  };

  const getLegalBasisLabel = (basis: string) => {
    const basisObj = LEGAL_BASIS_OPTIONS.find(b => b.value === basis);
    return isSpanish ? basisObj?.labelEs || basis : basisObj?.label || basis;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {isSpanish ? 'Registro de Actividades de Tratamiento' : 'Data Processing Register'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isSpanish ? '🧙 Asistente' : '🧙 Wizard'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
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
                <option value="ACTIVE">{getStatusLabel('ACTIVE')}</option>
                <option value="INACTIVE">{getStatusLabel('INACTIVE')}</option>
                <option value="UNDER_REVIEW">{getStatusLabel('UNDER_REVIEW')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Filtrar por Principio' : 'Filter by Pillar'}
              </label>
              <select
                value={filterPillar}
                onChange={(e) => setFilterPillar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todos' : 'All'}</option>
                {config.pillars.map(pillar => (
                  <option key={pillar.id} value={pillar.id}>
                    {isSpanish && pillar.nameEs ? pillar.nameEs : pillar.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Purges Tab */}
        {activeTab === 'purges' && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
              </div>
            ) : purges.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">
                  {isSpanish ? 'No se encontraron purgas de datos.' : 'No data purges found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sort purges by due date (most urgent first) */}
                {purges
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((purge) => {
                    const daysUntilDue = Math.floor(
                      (new Date(purge.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntilDue <= 7;
                    const isOverdue = daysUntilDue < 0;

                    return (
                      <div key={purge._id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{purge.purgeId}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                purge.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                purge.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                purge.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                purge.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {purge.status}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-200 text-red-900">
                                  {isSpanish ? '⚠️ Vencido' : '⚠️ Overdue'}
                                </span>
                              )}
                              {isUrgent && !isOverdue && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-200 text-yellow-900">
                                  {isSpanish ? '⚠️ Urgente' : '⚠️ Urgent'}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 mb-2">
                              <strong>{isSpanish ? 'Actividad:' : 'Activity:'}</strong> {purge.processingActivityId}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                              <div>
                                <strong>{isSpanish ? 'Data Owner:' : 'Data Owner:'}</strong> {purge.dataOwner?.name}
                                <br />
                                <span className="text-xs text-gray-500">{purge.dataOwner?.email}</span>
                              </div>
                              <div>
                                <strong>{isSpanish ? 'Tipos de Datos:' : 'Data Types:'}</strong> {purge.dataTypes.join(', ')}
                              </div>
                              <div>
                                <strong>{isSpanish ? 'Volumen:' : 'Volume:'}</strong> {purge.dataVolume?.estimatedRecords?.toLocaleString()} registros
                                <br />
                                <span className="text-xs">{purge.dataVolume?.estimatedSizeGB} GB</span>
                              </div>
                              <div>
                                <strong>{isSpanish ? 'Ubicaciones:' : 'Locations:'}</strong> {purge.dataLocations.join(', ')}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              <strong>{isSpanish ? 'Fecha Límite:' : 'Due Date:'}</strong> {new Date(purge.dueDate).toLocaleDateString()}
                              {isOverdue && (
                                <span className="text-red-600 font-semibold ml-2">
                                  ({Math.abs(daysUntilDue)} {isSpanish ? 'días vencidos' : 'days overdue'})
                                </span>
                              )}
                              {isUrgent && !isOverdue && (
                                <span className="text-yellow-600 font-semibold ml-2">
                                  ({daysUntilDue} {isSpanish ? 'días restantes' : 'days remaining'})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedActivityForPurge(activities.find(a => a.activityId === purge.processingActivityId) || null);
                                setShowPurgeWizard(true);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                            >
                              {isSpanish ? '✏️ Editar' : '✏️ Edit'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Activities List */}
        {activeTab === 'activities' && loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {isSpanish ? 'No se encontraron actividades.' : 'No activities found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{activity.activityName}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {getStatusLabel(activity.status)}
                      </span>
                      {activity.pillar && (
                        <span className="text-sm text-gray-500">
                          {config.pillars.find(p => p.id === activity.pillar)?.nameEs || activity.pillar}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-2">{activity.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>{isSpanish ? 'Propósito:' : 'Purpose:'}</strong> {activity.purpose}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Base Legal:' : 'Legal Basis:'}</strong> {getLegalBasisLabel(activity.legalBasis)}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Retención:' : 'Retention:'}</strong> {activity.retentionPeriod}
                      </div>
                      <div>
                        <strong>{isSpanish ? 'Consentimientos:' : 'Consents:'}</strong> {activity.consentCount}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <strong>{isSpanish ? 'Categorías de Datos:' : 'Data Categories:'}</strong> {activity.dataCategories.join(', ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedActivity(activity);
                        setShowDetailsModal(true);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                    >
                      {isSpanish ? 'Ver Detalles' : 'View Details'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingActivity(activity);
                        setFormData({
                          activityName: activity.activityName,
                          description: activity.description,
                          purpose: activity.purpose,
                          legalBasis: activity.legalBasis,
                          dataCategories: activity.dataCategories,
                          dataSubjectCategories: activity.dataSubjectCategories,
                          retentionPeriod: activity.retentionPeriod,
                          consentRequired: activity.consentRequired,
                          pillar: activity.pillar || '',
                        });
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                    >
                      {isSpanish ? '✏️ Editar' : '✏️ Edit'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal - Simplified for brevity */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Nueva Actividad de Tratamiento' : 'New Processing Activity'}
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Nombre de la Actividad' : 'Activity Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.activityName}
                      onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Descripción' : 'Description'} *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Propósito' : 'Purpose'} *
                    </label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Base Legal' : 'Legal Basis'} *
                      </label>
                      <select
                        value={formData.legalBasis}
                        onChange={(e) => setFormData({ ...formData, legalBasis: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {LEGAL_BASIS_OPTIONS.map(basis => (
                          <option key={basis.value} value={basis.value}>
                            {isSpanish ? basis.labelEs : basis.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isSpanish ? 'Período de Retención' : 'Retention Period'} *
                      </label>
                      <input
                        type="text"
                        value={formData.retentionPeriod}
                        onChange={(e) => setFormData({ ...formData, retentionPeriod: e.target.value })}
                        placeholder={isSpanish ? 'Ej: 5 años' : 'E.g.: 5 years'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.consentRequired}
                      onChange={(e) => setFormData({ ...formData, consentRequired: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">
                      {isSpanish ? 'Requiere Consentimiento' : 'Consent Required'}
                    </label>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleCreate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isSpanish ? 'Crear Actividad' : 'Create Activity'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard */}
        {showWizard && (
          <DataProcessingRegisterWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}

        {/* Details Modal - Placeholder */}
        {showDetailsModal && selectedActivity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">{selectedActivity.activityName}</h2>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedActivity(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <p><strong>{isSpanish ? 'Descripción:' : 'Description:'}</strong> {selectedActivity.description}</p>
                  <p><strong>{isSpanish ? 'Propósito:' : 'Purpose:'}</strong> {selectedActivity.purpose}</p>
                  <p><strong>{isSpanish ? 'Base Legal:' : 'Legal Basis:'}</strong> {getLegalBasisLabel(selectedActivity.legalBasis)}</p>
                  <p><strong>{isSpanish ? 'Categorías de Datos:' : 'Data Categories:'}</strong> {selectedActivity.dataCategories.join(', ')}</p>
                  <p><strong>{isSpanish ? 'Período de Retención:' : 'Retention Period:'}</strong> {selectedActivity.retentionPeriod}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
