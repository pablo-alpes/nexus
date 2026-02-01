'use client';

/**
 * Breach Notification Wizard
 * Interactive step-by-step wizard for breach notification (GDPR compliant)
 */

import { useState } from 'react';
import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface BreachNotificationWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function BreachNotificationWizard({ onComplete, onCancel }: BreachNotificationWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';

  const steps = [
    {
      id: 'incident-basics',
      title: 'Incident Basics',
      titleEs: 'Información Básica del Incidente',
      description: 'Provide basic information about the data breach',
      descriptionEs: 'Proporcione información básica sobre la brecha de datos',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Título del Incidente' : 'Incident Title'} *
            </label>
            <input
              type="text"
              value={data.incidentTitle || ''}
              onChange={(e) => updateData({ incidentTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: Acceso no autorizado a base de datos' : 'E.g.: Unauthorized access to database'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Descripción Detallada' : 'Detailed Description'} *
            </label>
            <textarea
              value={data.incidentDescription || ''}
              onChange={(e) => updateData({ incidentDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={5}
              placeholder={isSpanish ? 'Describa qué ocurrió, cómo se detectó, y el alcance inicial' : 'Describe what happened, how it was detected, and initial scope'}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Fecha de la Brecha' : 'Breach Date'} *
              </label>
              <input
                type="datetime-local"
                value={data.breachDate || ''}
                onChange={(e) => updateData({ breachDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Fecha de Descubrimiento' : 'Discovery Date'} *
              </label>
              <input
                type="datetime-local"
                value={data.discoveryDate || ''}
                onChange={(e) => updateData({ discoveryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
        </div>
      ),
      validation: () => {
        // Validation will be handled by required attributes
        return true;
      },
    },
    {
      id: 'breach-classification',
      title: 'Breach Classification',
      titleEs: 'Clasificación de la Brecha',
      description: 'Classify the type and category of the breach',
      descriptionEs: 'Clasifique el tipo y categoría de la brecha',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Tipo de Brecha' : 'Breach Type'} *
            </label>
            <select
              value={data.breachType || 'CONFIDENTIALITY'}
              onChange={(e) => updateData({ breachType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="CONFIDENTIALITY">{isSpanish ? 'Confidencialidad' : 'Confidentiality'}</option>
              <option value="INTEGRITY">{isSpanish ? 'Integridad' : 'Integrity'}</option>
              <option value="AVAILABILITY">{isSpanish ? 'Disponibilidad' : 'Availability'}</option>
              <option value="COMBINED">{isSpanish ? 'Combinado' : 'Combined'}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {isSpanish 
                ? 'Confidencialidad: acceso no autorizado. Integridad: datos alterados. Disponibilidad: datos no accesibles.'
                : 'Confidentiality: unauthorized access. Integrity: data altered. Availability: data not accessible.'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categoría de la Brecha' : 'Breach Category'} *
            </label>
            <select
              value={data.breachCategory || 'ACCIDENTAL'}
              onChange={(e) => updateData({ breachCategory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ACCIDENTAL">{isSpanish ? 'Accidental' : 'Accidental'}</option>
              <option value="MALICIOUS">{isSpanish ? 'Malicioso' : 'Malicious'}</option>
              <option value="SYSTEM_ERROR">{isSpanish ? 'Error del Sistema' : 'System Error'}</option>
              <option value="HUMAN_ERROR">{isSpanish ? 'Error Humano' : 'Human Error'}</option>
              <option value="OTHER">{isSpanish ? 'Otro' : 'Other'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Severidad' : 'Severity'} *
            </label>
            <select
              value={data.severity || 'MEDIUM'}
              onChange={(e) => updateData({ severity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="LOW">{isSpanish ? 'Bajo' : 'Low'}</option>
              <option value="MEDIUM">{isSpanish ? 'Medio' : 'Medium'}</option>
              <option value="HIGH">{isSpanish ? 'Alto' : 'High'}</option>
              <option value="CRITICAL">{isSpanish ? 'Crítico' : 'Critical'}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {isSpanish
                ? 'Crítico: >10,000 afectados o datos sensibles. Alto: 1,000-10,000 afectados. Medio: 100-1,000. Bajo: <100.'
                : 'Critical: >10,000 affected or sensitive data. High: 1,000-10,000. Medium: 100-1,000. Low: <100.'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'impact-assessment',
      title: 'Impact Assessment',
      titleEs: 'Evaluación de Impacto',
      description: 'Assess the impact and affected parties',
      descriptionEs: 'Evalúe el impacto y las partes afectadas',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Número de Titulares Afectados' : 'Number of Affected Data Subjects'} *
            </label>
            <input
              type="number"
              value={data.affectedDataSubjects || 0}
              onChange={(e) => updateData({ affectedDataSubjects: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {isSpanish
                ? 'Si el número exacto no se conoce, proporcione la mejor estimación'
                : 'If exact number is unknown, provide best estimate'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Datos Afectados' : 'Affected Data Categories'} *
            </label>
            <div className="space-y-2">
              {['Name', 'Email', 'Phone', 'Address', 'ID Number', 'Financial Data', 'Health Data', 'Biometric Data', 'Other'].map(category => {
                const label = isSpanish 
                  ? { 'Name': 'Nombre', 'Email': 'Email', 'Phone': 'Teléfono', 'Address': 'Dirección', 'ID Number': 'Número de Identificación', 'Financial Data': 'Datos Financieros', 'Health Data': 'Datos de Salud', 'Biometric Data': 'Datos Biométricos', 'Other': 'Otro' }[category] || category
                  : category;
                return (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(data.affectedDataCategories || []).includes(category)}
                      onChange={(e) => {
                        const current = data.affectedDataCategories || [];
                        if (e.target.checked) {
                          updateData({ affectedDataCategories: [...current, category] });
                        } else {
                          updateData({ affectedDataCategories: current.filter((c: string) => c !== category) });
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>{isSpanish ? '⚠️ Recordatorio GDPR:' : '⚠️ GDPR Reminder:'}</strong>
              {isSpanish
                ? ' Las brechas que afectan a más de 100 titulares o datos sensibles requieren notificación a la autoridad en 72 horas.'
                : ' Breaches affecting more than 100 subjects or sensitive data require authority notification within 72 hours.'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'containment-measures',
      title: 'Containment & Initial Response',
      titleEs: 'Contención y Respuesta Inicial',
      description: 'Document immediate containment measures taken',
      descriptionEs: 'Documente las medidas de contención inmediatas tomadas',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Medidas de Contención Implementadas' : 'Containment Measures Implemented'} *
            </label>
            <textarea
              value={data.containmentMeasures || ''}
              onChange={(e) => updateData({ containmentMeasures: e.target.value.split('\n').filter(m => m.trim()) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={6}
              placeholder={isSpanish 
                ? 'Ej:\n- Desconexión del sistema afectado\n- Cambio de credenciales\n- Bloqueo de accesos no autorizados'
                : 'E.g.:\n- Disconnected affected system\n- Changed credentials\n- Blocked unauthorized access'}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {isSpanish ? 'Una medida por línea' : 'One measure per line'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Responsable del Proceso' : 'Process Owner'} *
            </label>
            <input
              type="text"
              value={data.processOwner || ''}
              onChange={(e) => updateData({ processOwner: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Nombre del responsable' : 'Owner name'}
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
      title={isSpanish ? 'Nueva Brecha de Datos' : 'New Data Breach'}
      titleEs={isSpanish ? 'Nueva Brecha de Datos' : 'New Data Breach'}
    />
  );
}
