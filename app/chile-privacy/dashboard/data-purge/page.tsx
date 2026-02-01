'use client';

/**
 * Data Purge Page
 * Manages data purging activities and retention schedules
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import DataPurgeWizard from '@/components/wizards/DataPurgeWizard';

interface DataPurge {
  _id: string;
  purgeId: string;
  processingActivityId: string;
  activityName: string;
  description: string;
  dataOwner: {
    name: string;
    email: string;
  };
  dataTypes: string[];
  dataVolumeRecords?: number;
  dataVolumeGB?: number;
  storageLocations: string[];
  deletionCriteria: string;
  scheduledDate: string;
  completionDate?: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  verificationMethod?: 'MANUAL' | 'AUTOMATED';
  verificationDetails?: string;
  notes?: string;
}

interface ProcessingActivity {
  activityId: string;
  activityName: string;
}

export default function DataPurgePage() {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [purges, setPurges] = useState<DataPurge[]>([]);
  const [processingActivities, setProcessingActivities] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ProcessingActivity | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadPurges();
    loadProcessingActivities();
  }, [filterStatus]);

  const loadPurges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ regulation: String(regulationType) });
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await apiRequest<{ purges: DataPurge[] }>(`/data-purge?${params}`);
      setPurges(response.purges);
    } catch (error) {
      console.error('Failed to load purges:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProcessingActivities = async () => {
    try {
      const params = new URLSearchParams({ regulation: String(regulationType) });
      const response = await apiRequest<{ activities: ProcessingActivity[] }>(`/data-processing-register?${params}`);
      setProcessingActivities(response.activities);
    } catch (error) {
      console.error('Failed to load processing activities:', error);
    }
  };

  const handleWizardComplete = async (data: any) => {
    try {
      await apiRequest('/data-purge', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          regulationType,
        }),
      });
      setShowWizard(false);
      setSelectedActivity(null);
      loadPurges();
    } catch (error) {
      console.error('Failed to create purge:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      PENDING: { en: 'Pending', es: 'Pendiente' },
      SCHEDULED: { en: 'Scheduled', es: 'Programada' },
      IN_PROGRESS: { en: 'In Progress', es: 'En Progreso' },
      COMPLETED: { en: 'Completed', es: 'Completada' },
      FAILED: { en: 'Failed', es: 'Fallida' },
      CANCELLED: { en: 'Cancelled', es: 'Cancelada' },
    };
    return labels[status]?.[isSpanish ? 'es' : 'en'] || status;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(isSpanish ? 'es-CL' : 'en-US');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSpanish ? 'Purgas de Datos' : 'Data Purge'}
          </h1>
          <p className="text-gray-600">
            {isSpanish 
              ? 'Gestiona las actividades de purga de datos y los cronogramas de retención'
              : 'Manage data purging activities and retention schedules'}
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">{isSpanish ? 'Todos los Estados' : 'All Statuses'}</option>
              <option value="PENDING">{isSpanish ? 'Pendiente' : 'Pending'}</option>
              <option value="SCHEDULED">{isSpanish ? 'Programada' : 'Scheduled'}</option>
              <option value="IN_PROGRESS">{isSpanish ? 'En Progreso' : 'In Progress'}</option>
              <option value="COMPLETED">{isSpanish ? 'Completada' : 'Completed'}</option>
              <option value="FAILED">{isSpanish ? 'Fallida' : 'Failed'}</option>
              <option value="CANCELLED">{isSpanish ? 'Cancelada' : 'Cancelled'}</option>
            </select>
          </div>
          <button
            onClick={() => {
              setSelectedActivity(null);
              setShowWizard(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isSpanish ? '+ Nueva Purga' : '+ New Purge'}
          </button>
        </div>

        {/* Purges List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        ) : purges.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">
              {isSpanish ? 'No hay purgas registradas' : 'No purges registered'}
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isSpanish ? 'Crear Primera Purga' : 'Create First Purge'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'ID' : 'ID'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Actividad' : 'Activity'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Tipos de Datos' : 'Data Types'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Volumen' : 'Volume'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Fecha Programada' : 'Scheduled Date'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Estado' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isSpanish ? 'Propietario' : 'Owner'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purges.map((purge) => (
                  <tr key={purge._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {purge.purgeId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{purge.activityName}</div>
                        <div className="text-gray-500 text-xs">{purge.processingActivityId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {purge.dataTypes.slice(0, 3).map((type, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {type}
                          </span>
                        ))}
                        {purge.dataTypes.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{purge.dataTypes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {purge.dataVolumeRecords ? (
                        <div>
                          <div>{purge.dataVolumeRecords.toLocaleString()} {isSpanish ? 'registros' : 'records'}</div>
                          {purge.dataVolumeGB && (
                            <div className="text-gray-500 text-xs">{purge.dataVolumeGB} GB</div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(purge.scheduledDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purge.status)}`}>
                        {getStatusLabel(purge.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div>{purge.dataOwner.name}</div>
                        <div className="text-gray-500 text-xs">{purge.dataOwner.email}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <DataPurgeWizard
                processingActivityId={selectedActivity?.activityId || ''}
                processingActivityName={selectedActivity?.activityName || ''}
                onComplete={handleWizardComplete}
                onCancel={() => {
                  setShowWizard(false);
                  setSelectedActivity(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
