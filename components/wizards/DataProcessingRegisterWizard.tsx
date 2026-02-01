'use client';

/**
 * Data Processing Register Wizard
 * Interactive wizard for creating processing activities
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useState } from 'react';

interface DataProcessingRegisterWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function DataProcessingRegisterWizard({ onComplete, onCancel }: DataProcessingRegisterWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [dataSubjectCategories, setDataSubjectCategories] = useState<string[]>([]);
  const [keySystems, setKeySystems] = useState<string[]>([]);
  const [securityMeasures, setSecurityMeasures] = useState<string[]>([]);

  const steps = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      titleEs: 'Información Básica',
      description: 'Basic activity information',
      descriptionEs: 'Información básica de la actividad',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Nombre de la Actividad' : 'Activity Name'} *
            </label>
            <input
              type="text"
              value={data.activityName || ''}
              onChange={(e) => updateData({ activityName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: Procesamiento de Pedidos' : 'E.g.: Order Processing'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Descripción' : 'Description'} *
            </label>
            <textarea
              value={data.description || ''}
              onChange={(e) => updateData({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder={isSpanish ? 'Describa la actividad de procesamiento' : 'Describe the processing activity'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Propósito' : 'Purpose'} *
            </label>
            <textarea
              value={data.purpose || ''}
              onChange={(e) => updateData({ purpose: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder={isSpanish ? 'Propósito del procesamiento' : 'Purpose of processing'}
              required
            />
          </div>
        </div>
      ),
    },
    {
      id: 'legal-basis',
      title: 'Legal Basis & Data',
      titleEs: 'Base Legal y Datos',
      description: 'Legal basis and data categories',
      descriptionEs: 'Base legal y categorías de datos',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Base Legal' : 'Legal Basis'} *
            </label>
            <select
              value={data.legalBasis || ''}
              onChange={(e) => updateData({ legalBasis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
              <option value="CONSENT">{isSpanish ? 'Consentimiento' : 'Consent'}</option>
              <option value="CONTRACT">{isSpanish ? 'Contrato' : 'Contract'}</option>
              <option value="LEGAL_OBLIGATION">{isSpanish ? 'Obligación Legal' : 'Legal Obligation'}</option>
              <option value="VITAL_INTERESTS">{isSpanish ? 'Intereses Vitales' : 'Vital Interests'}</option>
              <option value="PUBLIC_TASK">{isSpanish ? 'Tarea Pública' : 'Public Task'}</option>
              <option value="LEGITIMATE_INTERESTS">{isSpanish ? 'Intereses Legítimos' : 'Legitimate Interests'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Datos' : 'Data Categories'} *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value && !dataCategories.includes(value)) {
                      const newCategories = [...dataCategories, value];
                      setDataCategories(newCategories);
                      updateData({ dataCategories: newCategories });
                      e.target.value = '';
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Presione Enter para agregar' : 'Press Enter to add'}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {dataCategories.map((cat, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {cat}
                  <button
                    type="button"
                    onClick={() => {
                      const newCategories = dataCategories.filter((_, i) => i !== idx);
                      setDataCategories(newCategories);
                      updateData({ dataCategories: newCategories });
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Titulares' : 'Data Subject Categories'} *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value && !dataSubjectCategories.includes(value)) {
                      const newCategories = [...dataSubjectCategories, value];
                      setDataSubjectCategories(newCategories);
                      updateData({ dataSubjectCategories: newCategories });
                      e.target.value = '';
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Presione Enter para agregar' : 'Press Enter to add'}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {dataSubjectCategories.map((cat, idx) => (
                <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {cat}
                  <button
                    type="button"
                    onClick={() => {
                      const newCategories = dataSubjectCategories.filter((_, i) => i !== idx);
                      setDataSubjectCategories(newCategories);
                      updateData({ dataSubjectCategories: newCategories });
                    }}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'owners-systems',
      title: 'Owners & Systems',
      titleEs: 'Propietarios y Sistemas',
      description: 'Data ownership and associated systems',
      descriptionEs: 'Propiedad de datos y sistemas asociados',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Data Owner - Nombre' : 'Data Owner - Name'} *
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
                {isSpanish ? 'Email' : 'Email'} *
              </label>
              <input
                type="email"
                value={data.dataOwner?.email || ''}
                onChange={(e) => updateData({ dataOwner: { ...data.dataOwner, email: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Data Steward - Nombre' : 'Data Steward - Name'}
              </label>
              <input
                type="text"
                value={data.dataSteward?.name || ''}
                onChange={(e) => updateData({ dataSteward: { ...data.dataSteward, name: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Email' : 'Email'}
              </label>
              <input
                type="email"
                value={data.dataSteward?.email || ''}
                onChange={(e) => updateData({ dataSteward: { ...data.dataSteward, email: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Sistemas Clave' : 'Key Systems'} *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value && !keySystems.includes(value)) {
                      const newSystems = [...keySystems, value];
                      setKeySystems(newSystems);
                      updateData({ keySystems: newSystems });
                      e.target.value = '';
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Ej: CRM, ERP, HRIS' : 'E.g.: CRM, ERP, HRIS'}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {keySystems.map((sys, idx) => (
                <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {sys}
                  <button
                    type="button"
                    onClick={() => {
                      const newSystems = keySystems.filter((_, i) => i !== idx);
                      setKeySystems(newSystems);
                      updateData({ keySystems: newSystems });
                    }}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'security-retention',
      title: 'Security & Retention',
      titleEs: 'Seguridad y Retención',
      description: 'Security measures and retention period',
      descriptionEs: 'Medidas de seguridad y período de retención',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Medidas de Seguridad' : 'Security Measures'} *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value && !securityMeasures.includes(value)) {
                      const newMeasures = [...securityMeasures, value];
                      setSecurityMeasures(newMeasures);
                      updateData({ securityMeasures: newMeasures });
                      e.target.value = '';
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Presione Enter para agregar' : 'Press Enter to add'}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {securityMeasures.map((measure, idx) => (
                <span key={idx} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {measure}
                  <button
                    type="button"
                    onClick={() => {
                      const newMeasures = securityMeasures.filter((_, i) => i !== idx);
                      setSecurityMeasures(newMeasures);
                      updateData({ securityMeasures: newMeasures });
                    }}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Encriptación' : 'Encryption'}
              </label>
              <input
                type="text"
                value={data.securityMeasuresDetails?.encryption || ''}
                onChange={(e) => updateData({ securityMeasuresDetails: { ...data.securityMeasuresDetails, encryption: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Tipo y estado' : 'Type and status'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Controles de Acceso' : 'Access Controls'}
              </label>
              <input
                type="text"
                value={data.securityMeasuresDetails?.accessControls || ''}
                onChange={(e) => updateData({ securityMeasuresDetails: { ...data.securityMeasuresDetails, accessControls: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Mecanismos de control' : 'Control mechanisms'}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Período de Retención' : 'Retention Period'} *
            </label>
            <input
              type="text"
              value={data.retentionPeriod || ''}
              onChange={(e) => updateData({ retentionPeriod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: 5 años, Hasta retiro de consentimiento' : 'E.g.: 5 years, Until consent withdrawal'}
              required
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.consentRequired || false}
                onChange={(e) => updateData({ consentRequired: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">
                {isSpanish ? 'Requiere Consentimiento' : 'Consent Required'}
              </span>
            </label>
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
      title={isSpanish ? 'Nueva Actividad de Procesamiento' : 'New Processing Activity'}
      titleEs="Nueva Actividad de Procesamiento"
    />
  );
}
