'use client';

/**
 * Data Governance Page
 * Manages data ownership, stewardship, and custodianship
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import DataGovernanceWizard from '@/components/wizards/DataGovernanceWizard';

interface DataGovernanceRecord {
  _id: string;
  governanceId: string;
  businessProcess: string;
  businessProcessDescription?: string;
  dataOwner: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
  dataSteward: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
  dataCustodian: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
  conceptualDataTypes: string[];
  keySystems: string[];
  dataCategories: string[];
  processingActivities: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  lastReviewDate?: string;
  nextReviewDate?: string;
  notes?: string;
}

export default function DataGovernancePage() {
  const { language, t } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [governanceRecords, setGovernanceRecords] = useState<DataGovernanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DataGovernanceRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [formData, setFormData] = useState({
    businessProcess: '',
    businessProcessDescription: '',
    dataOwner: { name: '', email: '', department: '', role: '' },
    dataSteward: { name: '', email: '', department: '', role: '' },
    dataCustodian: { name: '', email: '', department: '', role: '' },
    conceptualDataTypes: [] as string[],
    keySystems: [] as string[],
    dataCategories: [] as string[],
    processingActivities: [] as string[],
    notes: '',
  });

  useEffect(() => {
    loadGovernanceRecords();
  }, [filterStatus]);

  const loadGovernanceRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: String(regulationType) });
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await apiRequest<{ governanceRecords: DataGovernanceRecord[] }>(`/data-governance?${params}`);
      setGovernanceRecords(response.governanceRecords);
    } catch (error) {
      console.error('Failed to load governance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await apiRequest('/data-governance', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          regulationType,
        }),
      });
      setShowCreateModal(false);
      resetForm();
      loadGovernanceRecords();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      const mergedData: any = Object.values(data).reduce((acc: any, stepData: any) => ({ ...acc, ...stepData }), {});
      await apiRequest('/data-governance', {
        method: 'POST',
        body: JSON.stringify({
          ...mergedData,
          regulationType: regulationType,
        }),
      });
      setShowWizard(false);
      loadGovernanceRecords();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      businessProcess: '',
      businessProcessDescription: '',
      dataOwner: { name: '', email: '', department: '', role: '' },
      dataSteward: { name: '', email: '', department: '', role: '' },
      dataCustodian: { name: '', email: '', department: '', role: '' },
      conceptualDataTypes: [],
      keySystems: [],
      dataCategories: [],
      processingActivities: [],
      notes: '',
    });
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isSpanish ? 'Gobernanza de Datos' : 'Data Governance'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isSpanish 
                ? 'Gestión de ownership, stewardship y custodianship de datos'
                : 'Manage data ownership, stewardship, and custodianship'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isSpanish ? '🧙 Asistente' : '🧙 Wizard'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isSpanish ? '✏️ Manual' : '✏️ Manual'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{isSpanish ? 'Todos los Estados' : 'All Statuses'}</option>
            <option value="ACTIVE">{isSpanish ? 'Activo' : 'Active'}</option>
            <option value="INACTIVE">{isSpanish ? 'Inactivo' : 'Inactive'}</option>
            <option value="UNDER_REVIEW">{isSpanish ? 'En Revisión' : 'Under Review'}</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : governanceRecords.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">{isSpanish ? 'No hay registros de gobernanza' : 'No governance records found'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Proceso de Negocio' : 'Business Process'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Data Owner' : 'Data Owner'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Data Steward' : 'Data Steward'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Tipos de Datos' : 'Data Types'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Sistemas Clave' : 'Key Systems'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Estado' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Acciones' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {governanceRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.businessProcess}</div>
                      {record.businessProcessDescription && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {record.businessProcessDescription}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.dataOwner.name}</div>
                      <div className="text-sm text-gray-500">{record.dataOwner.email}</div>
                      <div className="text-xs text-gray-400">{record.dataOwner.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.dataSteward.name}</div>
                      <div className="text-sm text-gray-500">{record.dataSteward.email}</div>
                      <div className="text-xs text-gray-400">{record.dataSteward.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {record.conceptualDataTypes.slice(0, 3).map((type, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {type}
                          </span>
                        ))}
                        {record.conceptualDataTypes.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{record.conceptualDataTypes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {record.keySystems.slice(0, 2).map((system, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            {system}
                          </span>
                        ))}
                        {record.keySystems.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{record.keySystems.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        {isSpanish ? 'Ver' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {isSpanish ? 'Nuevo Registro de Gobernanza' : 'New Governance Record'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isSpanish ? 'Proceso de Negocio' : 'Business Process'} *
                    </label>
                    <input
                      type="text"
                      value={formData.businessProcess}
                      onChange={(e) => setFormData({ ...formData, businessProcess: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isSpanish ? 'Descripción del Proceso' : 'Process Description'}
                    </label>
                    <textarea
                      value={formData.businessProcessDescription}
                      onChange={(e) => setFormData({ ...formData, businessProcessDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Data Owner' : 'Data Owner'}</h3>
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Nombre' : 'Name'}
                        value={formData.dataOwner.name}
                        onChange={(e) => setFormData({ ...formData, dataOwner: { ...formData.dataOwner, name: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <input
                        type="email"
                        placeholder={isSpanish ? 'Email' : 'Email'}
                        value={formData.dataOwner.email}
                        onChange={(e) => setFormData({ ...formData, dataOwner: { ...formData.dataOwner, email: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Departamento' : 'Department'}
                        value={formData.dataOwner.department}
                        onChange={(e) => setFormData({ ...formData, dataOwner: { ...formData.dataOwner, department: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Rol' : 'Role'}
                        value={formData.dataOwner.role}
                        onChange={(e) => setFormData({ ...formData, dataOwner: { ...formData.dataOwner, role: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Data Steward' : 'Data Steward'}</h3>
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Nombre' : 'Name'}
                        value={formData.dataSteward.name}
                        onChange={(e) => setFormData({ ...formData, dataSteward: { ...formData.dataSteward, name: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <input
                        type="email"
                        placeholder={isSpanish ? 'Email' : 'Email'}
                        value={formData.dataSteward.email}
                        onChange={(e) => setFormData({ ...formData, dataSteward: { ...formData.dataSteward, email: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Departamento' : 'Department'}
                        value={formData.dataSteward.department}
                        onChange={(e) => setFormData({ ...formData, dataSteward: { ...formData.dataSteward, department: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Rol' : 'Role'}
                        value={formData.dataSteward.role}
                        onChange={(e) => setFormData({ ...formData, dataSteward: { ...formData.dataSteward, role: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">{isSpanish ? 'Data Custodian' : 'Data Custodian'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Nombre' : 'Name'}
                        value={formData.dataCustodian.name}
                        onChange={(e) => setFormData({ ...formData, dataCustodian: { ...formData.dataCustodian, name: e.target.value } })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="email"
                        placeholder={isSpanish ? 'Email' : 'Email'}
                        value={formData.dataCustodian.email}
                        onChange={(e) => setFormData({ ...formData, dataCustodian: { ...formData.dataCustodian, email: e.target.value } })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Departamento' : 'Department'}
                        value={formData.dataCustodian.department}
                        onChange={(e) => setFormData({ ...formData, dataCustodian: { ...formData.dataCustodian, department: e.target.value } })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Rol' : 'Role'}
                        value={formData.dataCustodian.role}
                        onChange={(e) => setFormData({ ...formData, dataCustodian: { ...formData.dataCustodian, role: e.target.value } })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isSpanish ? 'Tipos de Datos Conceptuales' : 'Conceptual Data Types'} *
                    </label>
                    <input
                      type="text"
                      placeholder={isSpanish ? 'Separados por comas (ej: Customer Data, Financial Data)' : 'Comma separated (e.g., Customer Data, Financial Data)'}
                      value={formData.conceptualDataTypes.join(', ')}
                      onChange={(e) => setFormData({ ...formData, conceptualDataTypes: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isSpanish ? 'Sistemas Clave' : 'Key Systems'} *
                    </label>
                    <input
                      type="text"
                      placeholder={isSpanish ? 'Separados por comas (ej: CRM System, ERP System)' : 'Comma separated (e.g., CRM System, ERP System)'}
                      value={formData.keySystems.join(', ')}
                      onChange={(e) => setFormData({ ...formData, keySystems: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {isSpanish ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isSpanish ? 'Crear' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">{selectedRecord.businessProcess}</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {selectedRecord.businessProcessDescription && (
                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Descripción' : 'Description'}</h3>
                      <p className="text-gray-700">{selectedRecord.businessProcessDescription}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Data Owner' : 'Data Owner'}</h3>
                      <p className="text-gray-700">{selectedRecord.dataOwner.name}</p>
                      <p className="text-sm text-gray-500">{selectedRecord.dataOwner.email}</p>
                      <p className="text-sm text-gray-400">{selectedRecord.dataOwner.department} - {selectedRecord.dataOwner.role}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Data Steward' : 'Data Steward'}</h3>
                      <p className="text-gray-700">{selectedRecord.dataSteward.name}</p>
                      <p className="text-sm text-gray-500">{selectedRecord.dataSteward.email}</p>
                      <p className="text-sm text-gray-400">{selectedRecord.dataSteward.department} - {selectedRecord.dataSteward.role}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Data Custodian' : 'Data Custodian'}</h3>
                      <p className="text-gray-700">{selectedRecord.dataCustodian.name}</p>
                      <p className="text-sm text-gray-500">{selectedRecord.dataCustodian.email}</p>
                      <p className="text-sm text-gray-400">{selectedRecord.dataCustodian.department} - {selectedRecord.dataCustodian.role}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">{isSpanish ? 'Tipos de Datos Conceptuales' : 'Conceptual Data Types'}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecord.conceptualDataTypes.map((type, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">{isSpanish ? 'Sistemas Clave' : 'Key Systems'}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecord.keySystems.map((system, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded">
                          {system}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedRecord.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">{isSpanish ? 'Notas' : 'Notes'}</h3>
                      <p className="text-gray-700">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    {isSpanish ? 'Cerrar' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard */}
        {showWizard && (
          <DataGovernanceWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}
      </div>
    </div>
  );
}
