'use client';

/**
 * Consent Management Wizard
 * Interactive wizard for recording consent (GDPR compliant)
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';

interface ConsentWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function ConsentWizard({ onComplete, onCancel }: ConsentWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const [processingActivities, setProcessingActivities] = useState<any[]>([]);

  useEffect(() => {
    loadProcessingActivities();
  }, []);

  const loadProcessingActivities = async () => {
    try {
      const response = await apiRequest<{ activities: any[] }>(`/data-processing-register?regulation=${RegulationType.CHILEAN_PRIVACY}`);
      setProcessingActivities(response.activities);
    } catch (error) {
      console.error('Failed to load processing activities:', error);
    }
  };

  const steps = [
    {
      id: 'processing-activity',
      title: 'Processing Activity',
      titleEs: 'Actividad de Tratamiento',
      description: 'Select the processing activity for which consent is being given',
      descriptionEs: 'Seleccione la actividad de tratamiento para la cual se otorga el consentimiento',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Actividad de Tratamiento' : 'Processing Activity'} *
            </label>
            <select
              value={data.processingActivityId || ''}
              onChange={(e) => updateData({ processingActivityId: e.target.value })}
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
            {data.processingActivityId && (
              <div className="mt-2 p-3 bg-gray-50 rounded">
                {(() => {
                  const activity = processingActivities.find(a => a.activityId === data.processingActivityId);
                  return activity ? (
                    <div className="text-sm">
                      <p><strong>{isSpanish ? 'Propósito:' : 'Purpose:'}</strong> {activity.purpose}</p>
                      <p className="mt-1"><strong>{isSpanish ? 'Categorías de Datos:' : 'Data Categories:'}</strong> {activity.dataCategories.join(', ')}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'data-subject-info',
      title: 'Data Subject Information',
      titleEs: 'Información del Titular',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Email del Titular' : 'Data Subject Email'} *
            </label>
            <input
              type="email"
              value={data.dataSubjectEmail || ''}
              onChange={(e) => updateData({ dataSubjectEmail: e.target.value })}
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
              value={data.dataSubjectName || ''}
              onChange={(e) => updateData({ dataSubjectName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      ),
    },
      {
        id: 'consent-details',
        title: 'Consent Details',
        titleEs: 'Detalles del Consentimiento',
        description: 'Specify consent type, method, and legal basis (Ley 21.719 Art. 12)',
        descriptionEs: 'Especifique el tipo, método y base legal del consentimiento (Ley 21.719 Art. 12)',
        component: ({ data, updateData }: any) => (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Tipo de Consentimiento' : 'Consent Type'} *
              </label>
              <select
                value={data.consentType || 'EXPLICIT'}
                onChange={(e) => updateData({ consentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="EXPLICIT">{isSpanish ? 'Explícito' : 'Explicit'}</option>
                <option value="IMPLICIT">{isSpanish ? 'Implícito' : 'Implicit'}</option>
                <option value="OPT_IN">{isSpanish ? 'Opt-In' : 'Opt-In'}</option>
                <option value="OPT_OUT">{isSpanish ? 'Opt-Out' : 'Opt-Out'}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {isSpanish
                  ? 'Ley 21.719 requiere consentimiento explícito para datos sensibles y marketing'
                  : 'Ley 21.719 requires explicit consent for sensitive data and marketing'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Método de Consentimiento' : 'Consent Method'} *
              </label>
              <select
                value={data.consentMethod || 'WEB_FORM'}
                onChange={(e) => updateData({ consentMethod: e.target.value })}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Base Legal (Ley 21.719 Art. 12)' : 'Legal Basis (Ley 21.719 Art. 12)'} *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'CONSENT', label: 'Consentimiento', labelEs: 'Consentimiento' },
                  { value: 'CONTRACT', label: 'Contract', labelEs: 'Contrato' },
                  { value: 'LEGAL_OBLIGATION', label: 'Legal Obligation', labelEs: 'Obligación Legal' },
                  { value: 'LEGITIMATE_INTEREST', label: 'Legitimate Interest', labelEs: 'Interés Legítimo' },
                ].map(basis => (
                  <label key={basis.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(data.legalBasis || []).includes(basis.value)}
                      onChange={(e) => {
                        const current = data.legalBasis || [];
                        if (e.target.checked) {
                          updateData({ legalBasis: [...current, basis.value] });
                        } else {
                          updateData({ legalBasis: current.filter((b: string) => b !== basis.value) });
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{isSpanish ? basis.labelEs : basis.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Justificación de Base Legal' : 'Legal Basis Justification'} *
              </label>
              <textarea
                value={data.legalBasisJustification || ''}
                onChange={(e) => updateData({ legalBasisJustification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder={isSpanish
                  ? 'Ej: Consentimiento explícito otorgado por el titular conforme al Artículo 12 literal a) de la Ley 21.719'
                  : 'E.g.: Explicit consent granted by data subject per Article 12 literal a) of Ley 21.719'}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Justificación del Usuario' : 'User Justification'}
              </label>
              <textarea
                value={data.userJustification || ''}
                onChange={(e) => updateData({ userJustification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={isSpanish
                  ? 'Razón o justificación proporcionada por el usuario para otorgar el consentimiento'
                  : 'Reason or justification provided by user for granting consent'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Descripción del Propósito' : 'Purpose Description'}
              </label>
              <textarea
                value={data.purposeDescription || ''}
                onChange={(e) => updateData({ purposeDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={isSpanish
                  ? 'Descripción detallada del propósito del tratamiento'
                  : 'Detailed description of processing purpose'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Versión de Política de Privacidad' : 'Privacy Policy Version'} *
              </label>
              <input
                type="text"
                value={data.privacyPolicyVersion || '1.0'}
                onChange={(e) => updateData({ privacyPolicyVersion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1.0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {isSpanish
                  ? 'Versión de la política de privacidad que el titular aceptó'
                  : 'Version of privacy policy that the data subject accepted'}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>✓ {isSpanish ? 'Ley 21.719 Art. 12:' : 'Ley 21.719 Art. 12:'}</strong>
                {isSpanish
                  ? ' El consentimiento debe ser específico, informado, inequívoco y fácil de retirar. Debe documentarse la base legal conforme al Artículo 12.'
                  : ' Consent must be specific, informed, unambiguous, and easy to withdraw. Legal basis must be documented per Article 12.'}
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
      title={isSpanish ? 'Nuevo Consentimiento' : 'New Consent'}
      titleEs={isSpanish ? 'Nuevo Consentimiento' : 'New Consent'}
    />
  );
}
