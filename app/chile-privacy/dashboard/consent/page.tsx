'use client';

/**
 * Consent Management Page
 * Manages consent records for data processing activities
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import ConsentWizard from '@/components/wizards/ConsentWizard';

interface Consent {
  _id: string;
  consentId: string;
  dataSubjectEmail: string;
  dataSubjectName?: string;
  dataSubjectId?: string;
  processingActivityId: string;
  consentType: 'EXPLICIT' | 'IMPLICIT' | 'OPT_IN' | 'OPT_OUT';
  consentStatus: 'GIVEN' | 'WITHDRAWN' | 'EXPIRED';
  consentDate: string;
  withdrawalDate?: string;
  withdrawalReason?: string;
  privacyPolicyVersion: string;
  consentMethod: string;
  legalBasis?: string[];
  legalBasisJustification?: string;
  userJustification?: string;
  purposeDescription?: string;
  expiryDate?: string;
}

interface ProcessingActivity {
  activityId: string;
  activityName: string;
}

export default function ConsentPage() {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [consents, setConsents] = useState<Consent[]>([]);
  const [processingActivities, setProcessingActivities] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingConsent, setEditingConsent] = useState<Consent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterActivity, setFilterActivity] = useState<string>('');

  const [formData, setFormData] = useState({
    dataSubjectEmail: '',
    dataSubjectName: '',
    processingActivityId: '',
    consentType: 'EXPLICIT',
    privacyPolicyVersion: '1.0',
    consentMethod: 'WEB_FORM',
  });

  useEffect(() => {
    loadConsents();
    loadProcessingActivities();
  }, [filterStatus, filterActivity]);

  const loadConsents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: regulationType });
      if (filterStatus) params.append('consentStatus', filterStatus);
      if (filterActivity) params.append('processingActivityId', filterActivity);
      
      const response = await apiRequest<{ consents: Consent[] }>(`/consent?${params}`);
      setConsents(response.consents);
    } catch (error) {
      console.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProcessingActivities = async () => {
    try {
      const response = await apiRequest<{ activities: ProcessingActivity[] }>(`/data-processing-register?regulation=${regulationType}`);
      setProcessingActivities(response.activities);
    } catch (error) {
      console.error('Failed to load processing activities:', error);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      // Merge data from all wizard steps
      const mergedData: any = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      
      await apiRequest('/consent', {
        method: 'POST',
        body: JSON.stringify({
          ...mergedData,
          regulationType: regulationType,
        }),
      });
      setShowWizard(false);
      loadConsents();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleManualCreate = async () => {
    try {
      await apiRequest('/consent', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          regulation: regulationType,
        }),
      });
      setShowManualForm(false);
      setFormData({
        dataSubjectEmail: '',
        dataSubjectName: '',
        processingActivityId: '',
        consentType: 'EXPLICIT',
        privacyPolicyVersion: '1.0',
        consentMethod: 'WEB_FORM',
      });
      loadConsents();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleWithdraw = async (consentId: string, withdrawalReason?: string) => {
    if (!confirm(isSpanish ? '¿Está seguro de retirar este consentimiento?' : 'Are you sure you want to withdraw this consent?')) {
      return;
    }
    try {
      await apiRequest('/consent', {
        method: 'PUT',
        body: JSON.stringify({
          consentId,
          action: 'withdraw',
          withdrawalReason,
        }),
      });
      loadConsents();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleEdit = (consent: Consent) => {
    setEditingConsent(consent);
    setFormData({
      dataSubjectEmail: consent.dataSubjectEmail,
      dataSubjectName: consent.dataSubjectName || '',
      processingActivityId: consent.processingActivityId,
      consentType: consent.consentType,
      privacyPolicyVersion: consent.privacyPolicyVersion,
      consentMethod: consent.consentMethod,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingConsent) return;
    try {
      await apiRequest('/consent', {
        method: 'PUT',
        body: JSON.stringify({
          consentId: editingConsent.consentId,
          ...formData,
          regulationType,
        }),
      });
      setShowEditModal(false);
      setEditingConsent(null);
      resetForm();
      loadConsents();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      dataSubjectEmail: '',
      dataSubjectName: '',
      processingActivityId: '',
      consentType: 'EXPLICIT',
      privacyPolicyVersion: '1.0',
      consentMethod: 'WEB_FORM',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GIVEN': return 'bg-green-100 text-green-800';
      case 'WITHDRAWN': return 'bg-red-100 text-red-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      GIVEN: { en: 'Given', es: 'Otorgado' },
      WITHDRAWN: { en: 'Withdrawn', es: 'Retirado' },
      EXPIRED: { en: 'Expired', es: 'Expirado' },
    };
    return isSpanish ? labels[status]?.es || status : labels[status]?.en || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {isSpanish ? 'Gestión de Consentimientos' : 'Consent Management'}
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
                <option value="GIVEN">{getStatusLabel('GIVEN')}</option>
                <option value="WITHDRAWN">{getStatusLabel('WITHDRAWN')}</option>
                <option value="EXPIRED">{getStatusLabel('EXPIRED')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Filtrar por Actividad' : 'Filter by Activity'}
              </label>
              <select
                value={filterActivity}
                onChange={(e) => setFilterActivity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todas' : 'All'}</option>
                {processingActivities.map(activity => (
                  <option key={activity.activityId} value={activity.activityId}>
                    {activity.activityName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Consents List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : consents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {isSpanish ? 'No se encontraron consentimientos.' : 'No consents found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {consents.map((consent) => {
              const activity = processingActivities.find(a => a.activityId === consent.processingActivityId);
              return (
                <div key={consent._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{consent.consentId}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(consent.consentStatus)}`}>
                          {getStatusLabel(consent.consentStatus)}
                        </span>
                        <span className="text-sm text-gray-500">{consent.consentType}</span>
                      </div>
                      <p className="text-gray-700 mb-2">
                        <strong>{isSpanish ? 'Titular:' : 'Data Subject:'}</strong> {consent.dataSubjectName || 'N/A'} ({consent.dataSubjectEmail})
                        {consent.dataSubjectId && <span className="text-gray-500 ml-2">({consent.dataSubjectId})</span>}
                      </p>
                      <p className="text-gray-600 mb-2">
                        <strong>{isSpanish ? 'Actividad:' : 'Activity:'}</strong> {activity?.activityName || consent.processingActivityId}
                      </p>
                      {consent.purposeDescription && (
                        <p className="text-gray-600 mb-2 text-sm">
                          <strong>{isSpanish ? 'Descripción del Propósito:' : 'Purpose Description:'}</strong> {consent.purposeDescription}
                        </p>
                      )}
                      {consent.legalBasis && consent.legalBasis.length > 0 && (
                        <p className="text-gray-600 mb-2 text-sm">
                          <strong>{isSpanish ? 'Base Legal:' : 'Legal Basis:'}</strong> {consent.legalBasis.join(', ')}
                        </p>
                      )}
                      {consent.legalBasisJustification && (
                        <p className="text-gray-600 mb-2 text-sm">
                          <strong>{isSpanish ? 'Justificación Base Legal:' : 'Legal Basis Justification:'}</strong> {consent.legalBasisJustification}
                        </p>
                      )}
                      {consent.userJustification && (
                        <p className="text-gray-600 mb-2 text-sm">
                          <strong>{isSpanish ? 'Justificación del Usuario:' : 'User Justification:'}</strong> {consent.userJustification}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>
                          {isSpanish ? 'Fecha:' : 'Date:'} {consent.consentDate ? new Date(consent.consentDate).toLocaleDateString(isSpanish ? 'es-CL' : 'en-US') : 'N/A'}
                        </span>
                        <span>
                          {isSpanish ? 'Versión Política:' : 'Policy Version:'} {consent.privacyPolicyVersion || 'N/A'}
                        </span>
                        <span>
                          {isSpanish ? 'Método:' : 'Method:'} {consent.consentMethod || 'N/A'}
                        </span>
                        {consent.withdrawalDate && (
                          <span className="text-red-600">
                            {isSpanish ? 'Retirado:' : 'Withdrawn:'} {new Date(consent.withdrawalDate).toLocaleDateString(isSpanish ? 'es-CL' : 'en-US')}
                            {consent.withdrawalReason && <span className="ml-2">({consent.withdrawalReason})</span>}
                          </span>
                        )}
                      </div>
                      {(consent as any).expiryDate && (
                        <div className="text-sm text-gray-500">
                          <strong>{isSpanish ? 'Fecha de Expiración:' : 'Expiry Date:'}</strong> {new Date((consent as any).expiryDate).toLocaleDateString(isSpanish ? 'es-CL' : 'en-US')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(consent)}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                        title={isSpanish ? 'Editar' : 'Edit'}
                      >
                        {isSpanish ? '✏️ Editar' : '✏️ Edit'}
                      </button>
                      {consent.consentStatus === 'GIVEN' && (
                        <button
                          onClick={() => handleWithdraw(consent.consentId)}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                          title={isSpanish ? 'Retirar' : 'Withdraw'}
                        >
                          {isSpanish ? '🚫 Retirar' : '🚫 Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingConsent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Editar Consentimiento' : 'Edit Consent'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingConsent(null);
                      resetForm();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">
                      <strong>{isSpanish ? 'ID:' : 'ID:'}</strong> {editingConsent.consentId}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>{isSpanish ? 'Estado:' : 'Status:'}</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(editingConsent.consentStatus)}`}>
                        {getStatusLabel(editingConsent.consentStatus)}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Email del Titular' : 'Data Subject Email'} *
                    </label>
                    <input
                      type="email"
                      value={formData.dataSubjectEmail}
                      onChange={(e) => setFormData({ ...formData, dataSubjectEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Nombre del Titular' : 'Data Subject Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.dataSubjectName}
                      onChange={(e) => setFormData({ ...formData, dataSubjectName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Actividad de Tratamiento' : 'Processing Activity'} *
                    </label>
                    <select
                      value={formData.processingActivityId}
                      onChange={(e) => setFormData({ ...formData, processingActivityId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
                      {processingActivities.map(activity => (
                        <option key={activity.activityId} value={activity.activityId}>
                          {activity.activityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Tipo de Consentimiento' : 'Consent Type'} *
                    </label>
                    <select
                      value={formData.consentType}
                      onChange={(e) => setFormData({ ...formData, consentType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="EXPLICIT">{isSpanish ? 'Explícito' : 'Explicit'}</option>
                      <option value="IMPLICIT">{isSpanish ? 'Implícito' : 'Implicit'}</option>
                      <option value="OPT_IN">{isSpanish ? 'Opt-In' : 'Opt-In'}</option>
                      <option value="OPT_OUT">{isSpanish ? 'Opt-Out' : 'Opt-Out'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Versión de Política de Privacidad' : 'Privacy Policy Version'} *
                    </label>
                    <input
                      type="text"
                      value={formData.privacyPolicyVersion}
                      onChange={(e) => setFormData({ ...formData, privacyPolicyVersion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Método de Consentimiento' : 'Consent Method'} *
                    </label>
                    <select
                      value={formData.consentMethod}
                      onChange={(e) => setFormData({ ...formData, consentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="WEB_FORM">{isSpanish ? 'Formulario Web' : 'Web Form'}</option>
                      <option value="EMAIL">{isSpanish ? 'Email' : 'Email'}</option>
                      <option value="PHONE">{isSpanish ? 'Teléfono' : 'Phone'}</option>
                      <option value="PAPER">{isSpanish ? 'Papel' : 'Paper'}</option>
                      <option value="IN_PERSON">{isSpanish ? 'En Persona' : 'In Person'}</option>
                      <option value="OTHER">{isSpanish ? 'Otro' : 'Other'}</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingConsent(null);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isSpanish ? 'Guardar Cambios' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard */}
        {showWizard && (
          <ConsentWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}

        {/* Manual Create Modal */}
        {showManualForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Nuevo Consentimiento' : 'New Consent'}
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
                      {isSpanish ? 'Email del Titular' : 'Data Subject Email'} *
                    </label>
                    <input
                      type="email"
                      value={formData.dataSubjectEmail}
                      onChange={(e) => setFormData({ ...formData, dataSubjectEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Nombre del Titular' : 'Data Subject Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.dataSubjectName}
                      onChange={(e) => setFormData({ ...formData, dataSubjectName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Actividad de Tratamiento' : 'Processing Activity'} *
                    </label>
                    <select
                      value={formData.processingActivityId}
                      onChange={(e) => setFormData({ ...formData, processingActivityId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
                      {processingActivities.map(activity => (
                        <option key={activity.activityId} value={activity.activityId}>
                          {activity.activityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Tipo de Consentimiento' : 'Consent Type'} *
                    </label>
                    <select
                      value={formData.consentType}
                      onChange={(e) => setFormData({ ...formData, consentType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="EXPLICIT">{isSpanish ? 'Explícito' : 'Explicit'}</option>
                      <option value="IMPLICIT">{isSpanish ? 'Implícito' : 'Implicit'}</option>
                      <option value="OPT_IN">{isSpanish ? 'Opt-In' : 'Opt-In'}</option>
                      <option value="OPT_OUT">{isSpanish ? 'Opt-Out' : 'Opt-Out'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Versión de Política de Privacidad' : 'Privacy Policy Version'} *
                    </label>
                    <input
                      type="text"
                      value={formData.privacyPolicyVersion}
                      onChange={(e) => setFormData({ ...formData, privacyPolicyVersion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowManualForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleManualCreate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isSpanish ? 'Crear Consentimiento' : 'Create Consent'}
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
