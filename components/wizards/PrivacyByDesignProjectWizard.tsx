'use client';

/**
 * Privacy by Design Project Wizard
 * Interactive wizard for creating projects with privacy considerations
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface PrivacyByDesignProjectWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function PrivacyByDesignProjectWizard({ onComplete, onCancel }: PrivacyByDesignProjectWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';

  const steps = [
    {
      id: 'project-basics',
      title: 'Project Basics',
      titleEs: 'Información Básica del Proyecto',
      description: 'Basic information about the project',
      descriptionEs: 'Información básica sobre el proyecto',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Nombre del Proyecto' : 'Project Name'} *
            </label>
            <input
              type="text"
              value={data.projectName || ''}
              onChange={(e) => updateData({ projectName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: Nuevo Sistema CRM' : 'E.g.: New CRM System'}
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
              placeholder={isSpanish ? 'Describa el propósito y alcance del proyecto' : 'Describe the purpose and scope of the project'}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Tipo de Proyecto' : 'Project Type'} *
              </label>
              <select
                value={data.projectType || ''}
                onChange={(e) => updateData({ projectType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
                <option value="NEW_SYSTEM">{isSpanish ? 'Nuevo Sistema' : 'New System'}</option>
                <option value="SYSTEM_UPDATE">{isSpanish ? 'Actualización de Sistema' : 'System Update'}</option>
                <option value="DATA_PROCESSING">{isSpanish ? 'Procesamiento de Datos' : 'Data Processing'}</option>
                <option value="THIRD_PARTY_INTEGRATION">{isSpanish ? 'Integración con Terceros' : 'Third Party Integration'}</option>
                <option value="OTHER">{isSpanish ? 'Otro' : 'Other'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Fecha de Inicio' : 'Start Date'} *
              </label>
              <input
                type="date"
                value={data.startDate || ''}
                onChange={(e) => updateData({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Responsable del Proyecto' : 'Project Owner'} *
              </label>
              <input
                type="text"
                value={data.projectOwner || ''}
                onChange={(e) => updateData({ projectOwner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Unidad de Negocio' : 'Business Unit'} *
              </label>
              <input
                type="text"
                value={data.businessUnit || ''}
                onChange={(e) => updateData({ businessUnit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'data-processing',
      title: 'Data Processing Details',
      titleEs: 'Detalles del Procesamiento',
      description: 'What data will be processed?',
      descriptionEs: '¿Qué datos se procesarán?',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Datos' : 'Data Categories'} *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
              {['PERSONAL', 'CONTACT', 'FINANCIAL', 'HEALTH', 'BIOMETRIC', 'LOCATION', 'BEHAVIORAL', 'CRIMINAL'].map(category => {
                const labels: Record<string, { en: string; es: string }> = {
                  'PERSONAL': { en: 'Personal Information', es: 'Información Personal' },
                  'CONTACT': { en: 'Contact Details', es: 'Detalles de Contacto' },
                  'FINANCIAL': { en: 'Financial Data', es: 'Datos Financieros' },
                  'HEALTH': { en: 'Health Data', es: 'Datos de Salud' },
                  'BIOMETRIC': { en: 'Biometric Data', es: 'Datos Biométricos' },
                  'LOCATION': { en: 'Location Data', es: 'Datos de Ubicación' },
                  'BEHAVIORAL': { en: 'Behavioral Data', es: 'Datos de Comportamiento' },
                  'CRIMINAL': { en: 'Criminal Data', es: 'Datos Penales' },
                };
                return (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(data.dataCategories || []).includes(category)}
                      onChange={(e) => {
                        const current = data.dataCategories || [];
                        if (e.target.checked) {
                          updateData({ dataCategories: [...current, category] });
                        } else {
                          updateData({ dataCategories: current.filter((c: string) => c !== category) });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{isSpanish ? labels[category]?.es : labels[category]?.en}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Titulares' : 'Data Subject Categories'} *
            </label>
            <div className="space-y-2">
              {['CUSTOMERS', 'EMPLOYEES', 'SUPPLIERS', 'VISITORS', 'CHILDREN'].map(category => {
                const labels: Record<string, { en: string; es: string }> = {
                  'CUSTOMERS': { en: 'Customers', es: 'Clientes' },
                  'EMPLOYEES': { en: 'Employees', es: 'Empleados' },
                  'SUPPLIERS': { en: 'Suppliers', es: 'Proveedores' },
                  'VISITORS': { en: 'Website Visitors', es: 'Visitantes Web' },
                  'CHILDREN': { en: 'Children', es: 'Niños' },
                };
                return (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(data.dataSubjectCategories || []).includes(category)}
                      onChange={(e) => {
                        const current = data.dataSubjectCategories || [];
                        if (e.target.checked) {
                          updateData({ dataSubjectCategories: [...current, category] });
                        } else {
                          updateData({ dataSubjectCategories: current.filter((c: string) => c !== category) });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{isSpanish ? labels[category]?.es : labels[category]?.en}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Base Legal' : 'Legal Basis'} *
            </label>
            <div className="space-y-2">
              {['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'LEGITIMATE_INTEREST', 'PUBLIC_TASK', 'VITAL_INTERESTS'].map(basis => {
                const labels: Record<string, { en: string; es: string }> = {
                  'CONSENT': { en: 'Consent', es: 'Consentimiento' },
                  'CONTRACT': { en: 'Contract', es: 'Contrato' },
                  'LEGAL_OBLIGATION': { en: 'Legal Obligation', es: 'Obligación Legal' },
                  'LEGITIMATE_INTEREST': { en: 'Legitimate Interest', es: 'Interés Legítimo' },
                  'PUBLIC_TASK': { en: 'Public Task', es: 'Misión de Interés Público' },
                  'VITAL_INTERESTS': { en: 'Vital Interests', es: 'Intereses Vitales' },
                };
                return (
                  <label key={basis} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(data.legalBasis || []).includes(basis)}
                      onChange={(e) => {
                        const current = data.legalBasis || [];
                        if (e.target.checked) {
                          updateData({ legalBasis: [...current, basis] });
                        } else {
                          updateData({ legalBasis: current.filter((b: string) => b !== basis) });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{isSpanish ? labels[basis]?.es : labels[basis]?.en}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={data.internationalTransfers || false}
              onChange={(e) => updateData({ internationalTransfers: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">
              {isSpanish ? '¿Incluye transferencias internacionales de datos?' : 'Does this project involve international data transfers?'}
            </label>
          </div>
          {data.internationalTransfers && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ {isSpanish ? 'Requisito GDPR:' : 'GDPR Requirement:'}</strong>
                {isSpanish
                  ? ' Las transferencias internacionales requieren salvaguardas adecuadas y pueden requerir DPIA.'
                  : ' International transfers require adequate safeguards and may require DPIA.'}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'risk-assessment',
      title: 'Initial Risk Assessment',
      titleEs: 'Evaluación Inicial de Riesgo',
      description: 'Initial assessment of privacy risks',
      descriptionEs: 'Evaluación inicial de riesgos de privacidad',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Evaluación Inicial de Riesgo' : 'Initial Risk Assessment'}
            </label>
            <textarea
              value={data.initialRiskAssessment || ''}
              onChange={(e) => updateData({ initialRiskAssessment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={5}
              placeholder={isSpanish
                ? 'Describa los riesgos iniciales identificados para la privacidad...'
                : 'Describe initial privacy risks identified...'}
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ {isSpanish ? 'Información:' : 'Information:'}</strong>
              {isSpanish
                ? ' Basado en los datos proporcionados, el sistema determinará automáticamente si se requiere un DPIA (Análisis de Impacto en Protección de Datos).'
                : ' Based on the data provided, the system will automatically determine if a DPIA (Data Protection Impact Assessment) is required.'}
            </p>
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
      title={isSpanish ? 'Nuevo Proyecto Privacy by Design' : 'New Privacy by Design Project'}
      titleEs={isSpanish ? 'Nuevo Proyecto Privacy by Design' : 'New Privacy by Design Project'}
    />
  );
}
