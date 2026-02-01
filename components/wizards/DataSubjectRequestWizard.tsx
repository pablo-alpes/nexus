'use client';

/**
 * Data Subject Request Wizard
 * Interactive wizard for data subject rights requests (GDPR compliant)
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface DataSubjectRequestWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function DataSubjectRequestWizard({ onComplete, onCancel }: DataSubjectRequestWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';

  const steps = [
    {
      id: 'request-type',
      title: 'Request Type',
      titleEs: 'Tipo de Solicitud',
      description: 'Select the type of data subject right you want to exercise',
      descriptionEs: 'Seleccione el tipo de derecho del titular que desea ejercer',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { value: 'ACCESS', label: 'Access Request', labelEs: 'Solicitud de Acceso', icon: '👁️', desc: 'Request access to your personal data', descEs: 'Solicitar acceso a sus datos personales' },
              { value: 'RECTIFICATION', label: 'Rectification', labelEs: 'Rectificación', icon: '✏️', desc: 'Correct inaccurate data', descEs: 'Corregir datos inexactos' },
              { value: 'DELETION', label: 'Right to be Forgotten', labelEs: 'Derecho al Olvido', icon: '🗑️', desc: 'Request deletion of your data', descEs: 'Solicitar eliminación de sus datos' },
              { value: 'PORTABILITY', label: 'Data Portability', labelEs: 'Portabilidad', icon: '📦', desc: 'Receive your data in portable format', descEs: 'Recibir sus datos en formato portable' },
              { value: 'OPPOSITION', label: 'Objection', labelEs: 'Oposición', icon: '🚫', desc: 'Object to processing', descEs: 'Oponerse al tratamiento' },
              { value: 'RESTRICTION', label: 'Restriction', labelEs: 'Restricción', icon: '⏸️', desc: 'Restrict processing activities', descEs: 'Restringir actividades de tratamiento' },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => updateData({ requestType: type.value })}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  data.requestType === type.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-semibold">{isSpanish ? type.labelEs : type.label}</div>
                <div className="text-sm text-gray-600 mt-1">{isSpanish ? type.descEs : type.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ),
      validation: () => {
        // Will be validated by checking data.requestType
        return true;
      },
    },
    {
      id: 'data-subject-info',
      title: 'Data Subject Information',
      titleEs: 'Información del Titular',
      description: 'Provide your contact information for the request',
      descriptionEs: 'Proporcione su información de contacto para la solicitud',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Nombre Completo' : 'Full Name'} *
            </label>
            <input
              type="text"
              value={data.dataSubjectName || ''}
              onChange={(e) => updateData({ dataSubjectName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Email' : 'Email Address'} *
            </label>
            <input
              type="email"
              value={data.dataSubjectEmail || ''}
              onChange={(e) => updateData({ dataSubjectEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {isSpanish
                ? 'Usaremos este email para comunicarnos sobre su solicitud'
                : 'We will use this email to communicate about your request'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Número de Identificación (Opcional)' : 'ID Number (Optional)'}
            </label>
            <input
              type="text"
              value={data.dataSubjectId || ''}
              onChange={(e) => updateData({ dataSubjectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Para verificación de identidad' : 'For identity verification'}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'request-details',
      title: 'Request Details',
      titleEs: 'Detalles de la Solicitud',
      description: 'Provide additional details about your request',
      descriptionEs: 'Proporcione detalles adicionales sobre su solicitud',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Descripción de la Solicitud' : 'Request Description'} *
            </label>
            <textarea
              value={data.description || ''}
              onChange={(e) => updateData({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={5}
              placeholder={isSpanish
                ? 'Describa su solicitud en detalle. Por ejemplo, qué datos específicos necesita acceder, corregir o eliminar.'
                : 'Describe your request in detail. E.g., what specific data you need to access, correct, or delete.'}
              required
            />
          </div>
          {data.requestType === 'ACCESS' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Categorías de Datos Solicitadas (Opcional)' : 'Requested Data Categories (Optional)'}
              </label>
              <div className="space-y-2">
                {['Personal Information', 'Contact Details', 'Financial Data', 'Health Records', 'Employment Data', 'All Data'].map(category => {
                  const label = isSpanish
                    ? { 'Personal Information': 'Información Personal', 'Contact Details': 'Detalles de Contacto', 'Financial Data': 'Datos Financieros', 'Health Records': 'Registros de Salud', 'Employment Data': 'Datos Laborales', 'All Data': 'Todos los Datos' }[category] || category
                    : category;
                  return (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(data.requestedData || []).includes(category)}
                        onChange={(e) => {
                          const current = data.requestedData || [];
                          if (e.target.checked) {
                            updateData({ requestedData: [...current, category] });
                          } else {
                            updateData({ requestedData: current.filter((c: string) => c !== category) });
                          }
                        }}
                        className="mr-2"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{isSpanish ? 'ℹ️ Información:' : 'ℹ️ Information:'}</strong>
              {isSpanish
                ? ' Tiene derecho a recibir una respuesta en un plazo máximo de 30 días desde la recepción de su solicitud.'
                : ' You have the right to receive a response within a maximum of 30 days from receipt of your request.'}
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
      title={isSpanish ? 'Nueva Solicitud de Derechos' : 'New Data Subject Request'}
      titleEs={isSpanish ? 'Nueva Solicitud de Derechos' : 'New Data Subject Request'}
    />
  );
}
