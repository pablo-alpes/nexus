'use client';

/**
 * Data Purge Wizard
 * Interactive wizard for creating data purge/retention activities
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';

interface DataPurgeWizardProps {
  processingActivityId: string;
  processingActivityName: string;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

const PURGE_TYPES = [
  { value: 'SCHEDULED', label: 'Scheduled Purge', labelEs: 'Purga Programada' },
  { value: 'ON_DEMAND', label: 'On-Demand Purge', labelEs: 'Purga Bajo Demanda' },
  { value: 'LEGAL_REQUIREMENT', label: 'Legal Requirement', labelEs: 'Requisito Legal' },
  { value: 'CONSENT_WITHDRAWAL', label: 'Consent Withdrawal', labelEs: 'Retiro de Consentimiento' },
  { value: 'RETENTION_EXPIRY', label: 'Retention Expiry', labelEs: 'Expiración de Retención' },
];

const PURGE_METHODS = [
  { value: 'SOFT_DELETE', label: 'Soft Delete', labelEs: 'Eliminación Suave' },
  { value: 'HARD_DELETE', label: 'Hard Delete', labelEs: 'Eliminación Definitiva' },
  { value: 'ANONYMIZATION', label: 'Anonymization', labelEs: 'Anonimización' },
  { value: 'PSEUDONYMIZATION', label: 'Pseudonymization', labelEs: 'Pseudonimización' },
  { value: 'ARCHIVAL', label: 'Archival', labelEs: 'Archivado' },
];

const DATA_TYPES = [
  { value: 'PERSONAL', label: 'Personal Information', labelEs: 'Información Personal' },
  { value: 'CONTACT', label: 'Contact Details', labelEs: 'Detalles de Contacto' },
  { value: 'FINANCIAL', label: 'Financial Data', labelEs: 'Datos Financieros' },
  { value: 'HEALTH', label: 'Health Data', labelEs: 'Datos de Salud' },
  { value: 'BIOMETRIC', label: 'Biometric Data', labelEs: 'Datos Biométricos' },
  { value: 'LOCATION', label: 'Location Data', labelEs: 'Datos de Ubicación' },
  { value: 'BEHAVIORAL', label: 'Behavioral Data', labelEs: 'Datos de Comportamiento' },
  { value: 'OTHER', label: 'Other', labelEs: 'Otro' },
];

export default function DataPurgeWizard({ processingActivityId, processingActivityName, onComplete, onCancel }: DataPurgeWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const [processingActivity, setProcessingActivity] = useState<any>(null);

  useEffect(() => {
    loadProcessingActivity();
  }, [processingActivityId]);

  const loadProcessingActivity = async () => {
    try {
      const response = await apiRequest<{ activities: any[] }>(`/data-processing-register?regulation=${RegulationType.CHILEAN_PRIVACY}`);
      const activity = response.activities.find((a: any) => a.activityId === processingActivityId);
      if (activity) {
        setProcessingActivity(activity);
      }
    } catch (error) {
      console.error('Failed to load processing activity:', error);
    }
  };

  const steps = [
    {
      id: 'purge-basics',
      title: 'Purge Basics',
      titleEs: 'Información Básica de la Purga',
      description: 'Basic information about the data purge activity',
      descriptionEs: 'Información básica sobre la actividad de purga de datos',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm font-medium text-blue-900">
              {isSpanish ? 'Actividad de Tratamiento:' : 'Processing Activity:'} {processingActivityName}
            </p>
            {processingActivity && (
              <div className="mt-2 text-sm text-blue-700">
                <p><strong>{isSpanish ? 'Propósito:' : 'Purpose:'}</strong> {processingActivity.purpose}</p>
                <p><strong>{isSpanish ? 'Base Legal:' : 'Legal Basis:'}</strong> {processingActivity.legalBasis}</p>
                <p><strong>{isSpanish ? 'Período de Retención:' : 'Retention Period:'}</strong> {processingActivity.retentionPeriod}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Tipo de Purga' : 'Purge Type'} *
            </label>
            <select
              value={data.purgeType || ''}
              onChange={(e) => updateData({ purgeType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
              {PURGE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {isSpanish ? type.labelEs : type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Método de Purga' : 'Purge Method'} *
            </label>
            <select
              value={data.purgeMethod || ''}
              onChange={(e) => updateData({ purgeMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
              {PURGE_METHODS.map(method => (
                <option key={method.value} value={method.value}>
                  {isSpanish ? method.labelEs : method.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Fecha Programada' : 'Scheduled Date'} *
            </label>
            <input
              type="date"
              value={data.scheduledDate || ''}
              onChange={(e) => updateData({ scheduledDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Fecha Límite' : 'Due Date'} *
            </label>
            <input
              type="date"
              value={data.dueDate || ''}
              onChange={(e) => updateData({ dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        </div>
      ),
    },
    {
      id: 'data-details',
      title: 'Data Details',
      titleEs: 'Detalles de los Datos',
      description: 'Information about data types, volume, and locations',
      descriptionEs: 'Información sobre tipos de datos, volumen y ubicaciones',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Tipos de Datos' : 'Data Types'} *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
              {DATA_TYPES.map(type => (
                <label key={type.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(data.dataTypes || []).includes(type.value)}
                    onChange={(e) => {
                      const current = data.dataTypes || [];
                      if (e.target.checked) {
                        updateData({ dataTypes: [...current, type.value] });
                      } else {
                        updateData({ dataTypes: current.filter((t: string) => t !== type.value) });
                      }
                    }}
                    className="mr-2"
                  />
                  <span>{isSpanish ? type.labelEs : type.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Registros Estimados' : 'Estimated Records'} *
              </label>
              <input
                type="number"
                value={data.dataVolume?.estimatedRecords || ''}
                onChange={(e) => updateData({ 
                  dataVolume: { 
                    ...data.dataVolume, 
                    estimatedRecords: parseInt(e.target.value) || 0 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Tamaño Estimado (GB)' : 'Estimated Size (GB)'} *
              </label>
              <input
                type="number"
                step="0.01"
                value={data.dataVolume?.estimatedSizeGB || ''}
                onChange={(e) => updateData({ 
                  dataVolume: { 
                    ...data.dataVolume, 
                    estimatedSizeGB: parseFloat(e.target.value) || 0 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Ubicaciones de Datos (Sistemas/BDs)' : 'Data Locations (Systems/Databases)'} *
            </label>
            <input
              type="text"
              value={(data.dataLocations || []).join(', ')}
              onChange={(e) => updateData({ dataLocations: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: CRM, ERP, Base de Datos Principal' : 'E.g.: CRM, ERP, Main Database'}
              required
            />
          </div>
        </div>
      ),
    },
    {
      id: 'ownership-legal',
      title: 'Ownership & Legal',
      titleEs: 'Propiedad y Legal',
      description: 'Data owner and legal basis for purge',
      descriptionEs: 'Propietario de datos y base legal para la purga',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Nombre del Data Owner' : 'Data Owner Name'} *
            </label>
            <input
              type="text"
              value={data.dataOwner?.name || ''}
              onChange={(e) => updateData({ dataOwner: { ...data.dataOwner, name: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Email del Data Owner' : 'Data Owner Email'} *
            </label>
            <input
              type="email"
              value={data.dataOwner?.email || ''}
              onChange={(e) => updateData({ dataOwner: { ...data.dataOwner, email: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Criterios de Retención' : 'Retention Criteria'} *
            </label>
            <textarea
              value={data.retentionCriteria || ''}
              onChange={(e) => updateData({ retentionCriteria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder={isSpanish ? 'Describa los criterios de retención que justifican esta purga' : 'Describe the retention criteria that justify this purge'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Base Legal' : 'Legal Basis'} *
            </label>
            <textarea
              value={data.legalBasis || ''}
              onChange={(e) => updateData({ legalBasis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder={isSpanish ? 'Base legal para la purga de datos' : 'Legal basis for data purge'}
              required
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      onComplete={onComplete}
      onCancel={onCancel}
      title={isSpanish ? 'Asistente de Purga de Datos' : 'Data Purge Wizard'}
      titleEs={isSpanish ? 'Asistente de Purga de Datos' : 'Data Purge Wizard'}
    />
  );
}
