'use client';

/**
 * Data Subject Rights Portal
 * Manages data subject rights requests (access, rectification, deletion, portability, etc.)
 */

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { LanguageToggle } from '@/components/LanguageToggle';
import DataSubjectRequestWizard from '@/components/wizards/DataSubjectRequestWizard';

interface DataSubjectRequest {
  _id: string;
  requestId: string;
  requestType: 'ACCESS' | 'RECTIFICATION' | 'DELETION' | 'PORTABILITY' | 'OPPOSITION' | 'RESTRICTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  dataSubjectName: string;
  dataSubjectEmail: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
}

const REQUEST_TYPES = [
  { value: 'ACCESS', label: 'Access Request', labelEs: 'Solicitud de Acceso' },
  { value: 'RECTIFICATION', label: 'Rectification Request', labelEs: 'Solicitud de Rectificación' },
  { value: 'DELETION', label: 'Deletion Request', labelEs: 'Solicitud de Eliminación' },
  { value: 'PORTABILITY', label: 'Data Portability', labelEs: 'Portabilidad de Datos' },
  { value: 'OPPOSITION', label: 'Objection to Processing', labelEs: 'Oposición al Tratamiento' },
  { value: 'RESTRICTION', label: 'Restriction of Processing', labelEs: 'Restricción del Tratamiento' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function DataSubjectRightsPage() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const pathname = usePathname();
  const regulationType = RegulationType.CHILEAN_PRIVACY;
  const config = getRegulationConfig(regulationType);
  const isSpanish = language === 'es';

  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DataSubjectRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DataSubjectRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const [formData, setFormData] = useState({
    requestType: 'ACCESS',
    dataSubjectName: '',
    dataSubjectEmail: '',
    dataSubjectId: '',
    description: '',
    requestedData: [] as string[],
  });

  useEffect(() => {
    loadRequests();
  }, [filterStatus, filterType]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: regulationType });
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('requestType', filterType);
      
      const response = await apiRequest<{ requests: DataSubjectRequest[] }>(`/data-subject-requests?${params}`);
      setRequests(response.requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      // Merge data from all wizard steps
      const mergedData: any = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      
      await apiRequest('/data-subject-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...mergedData,
          regulationType: regulationType,
        }),
      });
      setShowWizard(false);
      loadRequests();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleManualCreate = async () => {
    try {
      await apiRequest('/data-subject-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          regulationType: regulationType,
        }),
      });
      setShowManualForm(false);
      setFormData({
        requestType: 'ACCESS',
        dataSubjectName: '',
        dataSubjectEmail: '',
        dataSubjectId: '',
        description: '',
        requestedData: [],
      });
      loadRequests();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      await apiRequest(`/data-subject-requests`, {
        method: 'PUT',
        body: JSON.stringify({
          requestId,
          status: newStatus,
        }),
      });
      loadRequests();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleEdit = (request: DataSubjectRequest) => {
    setEditingRequest(request);
    setFormData({
      requestType: request.requestType,
      dataSubjectName: request.dataSubjectName || '',
      dataSubjectEmail: request.dataSubjectEmail,
      dataSubjectId: (request as any).dataSubjectId || '',
      description: request.description || '',
      requestedData: (request as any).requestedData || [],
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingRequest) return;
    try {
      await apiRequest('/data-subject-requests', {
        method: 'PUT',
        body: JSON.stringify({
          requestId: editingRequest.requestId,
          ...formData,
        }),
      });
      setShowEditModal(false);
      setEditingRequest(null);
      loadRequests();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (dueDate: string): boolean => {
    return getDaysUntilDue(dueDate) < 0;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, { en: string; es: string }> = {
      PENDING: { en: 'Pending', es: 'Pendiente' },
      IN_PROGRESS: { en: 'In Progress', es: 'En Progreso' },
      COMPLETED: { en: 'Completed', es: 'Completado' },
      REJECTED: { en: 'Rejected', es: 'Rechazado' },
      CANCELLED: { en: 'Cancelled', es: 'Cancelado' },
    };
    return isSpanish ? labels[status]?.es || status : labels[status]?.en || status;
  };

  const getRequestTypeLabel = (type: string): string => {
    const typeObj = REQUEST_TYPES.find(t => t.value === type);
    return isSpanish ? typeObj?.labelEs || type : typeObj?.label || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {isSpanish ? 'Derechos del Titular de Datos' : 'Data Subject Rights'}
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
                {isSpanish ? 'Filtrar por Tipo' : 'Filter by Type'}
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{isSpanish ? 'Todos' : 'All'}</option>
                {REQUEST_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {isSpanish ? type.labelEs : type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {isSpanish ? 'No se encontraron solicitudes.' : 'No requests found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const daysUntilDue = getDaysUntilDue(request.dueDate);
              const overdue = isOverdue(request.dueDate);

              return (
                <div key={request._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{request.requestId}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                          {getStatusLabel(request.status)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getRequestTypeLabel(request.requestType)}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">
                        <strong>{isSpanish ? 'Titular:' : 'Data Subject:'}</strong> {request.dataSubjectName} ({request.dataSubjectEmail})
                      </p>
                      {request.description && (
                        <p className="text-gray-600 mb-2">{request.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {isSpanish ? 'Fecha límite:' : 'Due Date:'} {new Date(request.dueDate).toLocaleDateString()}
                        </span>
                        <span className={overdue ? 'text-red-600 font-semibold' : daysUntilDue <= 7 ? 'text-yellow-600 font-semibold' : ''}>
                          {overdue
                            ? `(${isSpanish ? 'Vencido' : 'Overdue'} ${Math.abs(daysUntilDue)} ${isSpanish ? 'días' : 'days'})`
                            : `(${daysUntilDue} ${isSpanish ? 'días restantes' : 'days remaining'})`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request.requestId, e.target.value)}
                        className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[request.status]} border-0`}
                      >
                        {Object.keys(STATUS_COLORS).map(status => (
                          <option key={status} value={status}>{getStatusLabel(status)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                      >
                        {isSpanish ? 'Ver Detalles' : 'View Details'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowEditModal(true);
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

        {/* Wizard */}
        {showWizard && (
          <DataSubjectRequestWizard
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
                    {isSpanish ? 'Nueva Solicitud' : 'New Request'}
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
                      {isSpanish ? 'Tipo de Solicitud' : 'Request Type'} *
                    </label>
                    <select
                      value={formData.requestType}
                      onChange={(e) => setFormData({ ...formData, requestType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {REQUEST_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {isSpanish ? type.labelEs : type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Nombre del Titular' : 'Data Subject Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.dataSubjectName}
                      onChange={(e) => setFormData({ ...formData, dataSubjectName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
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
                      {isSpanish ? 'Descripción' : 'Description'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
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
                      {isSpanish ? 'Crear Solicitud' : 'Create Request'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">{selectedRequest.requestId}</h2>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedRequest(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <strong>{isSpanish ? 'Tipo:' : 'Type:'}</strong> {getRequestTypeLabel(selectedRequest.requestType)}
                  </div>
                  <div>
                    <strong>{isSpanish ? 'Estado:' : 'Status:'}</strong> {getStatusLabel(selectedRequest.status)}
                  </div>
                  <div>
                    <strong>{isSpanish ? 'Titular:' : 'Data Subject:'}</strong> {selectedRequest.dataSubjectName} ({selectedRequest.dataSubjectEmail})
                  </div>
                  {selectedRequest.description && (
                    <div>
                      <strong>{isSpanish ? 'Descripción:' : 'Description:'}</strong>
                      <p className="mt-1">{selectedRequest.description}</p>
                    </div>
                  )}
                  <div>
                    <strong>{isSpanish ? 'Fecha límite:' : 'Due Date:'}</strong> {new Date(selectedRequest.dueDate).toLocaleDateString()}
                  </div>
                  {selectedRequest.completedDate && (
                    <div>
                      <strong>{isSpanish ? 'Fecha de completación:' : 'Completed Date:'}</strong> {new Date(selectedRequest.completedDate).toLocaleDateString()}
                    </div>
                  )}
                  {selectedRequest.notes && (
                    <div>
                      <strong>{isSpanish ? 'Notas:' : 'Notes:'}</strong>
                      <p className="mt-1">{selectedRequest.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Editar Solicitud' : 'Edit Request'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRequest(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Tipo de Solicitud' : 'Request Type'} *
                    </label>
                    <select
                      value={formData.requestType}
                      onChange={(e) => setFormData({ ...formData, requestType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {REQUEST_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {isSpanish ? type.labelEs : type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isSpanish ? 'Nombre del Titular' : 'Data Subject Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.dataSubjectName}
                      onChange={(e) => setFormData({ ...formData, dataSubjectName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
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
                      {isSpanish ? 'Descripción' : 'Description'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingRequest(null);
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
