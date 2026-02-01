'use client';

/**
 * Third Party Processor Wizard
 * Interactive wizard for registering third-party processors (GDPR Article 28)
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface ThirdPartyProcessorWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function ThirdPartyProcessorWizard({ onComplete, onCancel }: ThirdPartyProcessorWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';

  const steps = [
    {
      id: 'processor-basics',
      title: 'Processor Information',
      titleEs: 'Información del Procesador',
      description: 'Basic information about the third-party processor',
      descriptionEs: 'Información básica sobre el procesador de terceros',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Nombre del Procesador' : 'Processor Name'} *
            </label>
            <input
              type="text"
              value={data.name || ''}
              onChange={(e) => updateData({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: Amazon Web Services' : 'E.g.: Amazon Web Services'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Nombre de la Empresa' : 'Company Name'} *
            </label>
            <input
              type="text"
              value={data.companyName || ''}
              onChange={(e) => updateData({ companyName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Email de Contacto' : 'Contact Email'} *
              </label>
              <input
                type="email"
                value={data.contactEmail || ''}
                onChange={(e) => updateData({ contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'País' : 'Country'} *
              </label>
              <input
                type="text"
                value={data.country || ''}
                onChange={(e) => updateData({ country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Ej: Estados Unidos' : 'E.g.: United States'}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Tipo de Procesador' : 'Processor Type'} *
            </label>
            <select
              value={data.processorType || ''}
              onChange={(e) => updateData({ processorType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
              <option value="CLOUD_PROVIDER">{isSpanish ? 'Proveedor de Nube' : 'Cloud Provider'}</option>
              <option value="SaaS">{isSpanish ? 'Software como Servicio' : 'Software as a Service'}</option>
              <option value="PAAS">{isSpanish ? 'Plataforma como Servicio' : 'Platform as a Service'}</option>
              <option value="IAAS">{isSpanish ? 'Infraestructura como Servicio' : 'Infrastructure as a Service'}</option>
              <option value="DATA_ANALYTICS">{isSpanish ? 'Análisis de Datos' : 'Data Analytics'}</option>
              <option value="PAYMENT_PROCESSOR">{isSpanish ? 'Procesador de Pagos' : 'Payment Processor'}</option>
              <option value="MARKETING">{isSpanish ? 'Marketing' : 'Marketing'}</option>
              <option value="HR">{isSpanish ? 'Recursos Humanos' : 'Human Resources'}</option>
              <option value="OTHER">{isSpanish ? 'Otro' : 'Other'}</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: 'services-data',
      title: 'Services & Data',
      titleEs: 'Servicios y Datos',
      description: 'What services does the processor provide and what data is processed?',
      descriptionEs: '¿Qué servicios proporciona el procesador y qué datos se procesan?',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Servicios Proporcionados' : 'Services Provided'} *
            </label>
            <textarea
              value={(data.servicesProvided || []).join('\n')}
              onChange={(e) => updateData({ servicesProvided: e.target.value.split('\n').filter(s => s.trim()) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder={isSpanish ? 'Un servicio por línea\nEj:\n- Almacenamiento de datos\n- Procesamiento de pagos' : 'One service per line\nE.g.:\n- Data storage\n- Payment processing'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Datos Procesados' : 'Data Categories Processed'} *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
              {['Name', 'Email', 'Phone', 'Address', 'ID Number', 'Financial Data', 'Health Data', 'Biometric Data', 'Location Data', 'Behavioral Data'].map(category => {
                const label = isSpanish
                  ? { 'Name': 'Nombre', 'Email': 'Email', 'Phone': 'Teléfono', 'Address': 'Dirección', 'ID Number': 'Número de ID', 'Financial Data': 'Datos Financieros', 'Health Data': 'Datos de Salud', 'Biometric Data': 'Datos Biométricos', 'Location Data': 'Datos de Ubicación', 'Behavioral Data': 'Datos de Comportamiento' }[category] || category
                  : category;
                return (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(data.dataCategoriesProcessed || []).includes(category)}
                      onChange={(e) => {
                        const current = data.dataCategoriesProcessed || [];
                        if (e.target.checked) {
                          updateData({ dataCategoriesProcessed: [...current, category] });
                        } else {
                          updateData({ dataCategoriesProcessed: current.filter((c: string) => c !== category) });
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
        </div>
      ),
    },
    {
      id: 'contract-compliance',
      title: 'Contract & Compliance',
      titleEs: 'Contrato y Cumplimiento',
      description: 'Document contracts and compliance status (GDPR Article 28)',
      descriptionEs: 'Documente contratos y estado de cumplimiento (GDPR Artículo 28)',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              {isSpanish ? '⚠️ Requisito GDPR Artículo 28:' : '⚠️ GDPR Article 28 Requirement:'}
            </p>
            <p className="text-sm text-yellow-700">
              {isSpanish
                ? 'Debe existir un contrato escrito (DPA) que especifique las obligaciones del procesador.'
                : 'A written contract (DPA) must exist specifying the processor\'s obligations.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={data.contractSigned || false}
                onChange={(e) => updateData({ contractSigned: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                {isSpanish ? 'Contrato Firmado' : 'Contract Signed'}
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={data.dpaSigned || false}
                onChange={(e) => updateData({ dpaSigned: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                {isSpanish ? 'DPA Firmado' : 'DPA Signed'}
              </label>
            </div>
          </div>
          {data.contractSigned && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Fecha del Contrato' : 'Contract Date'}
              </label>
              <input
                type="date"
                value={data.contractDate || ''}
                onChange={(e) => updateData({ contractDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Certificaciones (Opcional)' : 'Certifications (Optional)'}
            </label>
            <div className="space-y-2">
              {['ISO 27001', 'SOC 2', 'ISO 27701', 'PCI DSS', 'HIPAA'].map(cert => (
                <label key={cert} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(data.certifications || []).some((c: any) => c.type === cert)}
                    onChange={(e) => {
                      const current = data.certifications || [];
                      if (e.target.checked) {
                        updateData({
                          certifications: [...current, { type: cert, issueDate: new Date().toISOString().split('T')[0] }],
                        });
                      } else {
                        updateData({ certifications: current.filter((c: any) => c.type !== cert) });
                      }
                    }}
                    className="mr-2"
                  />
                  <span>{cert}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Estado de Cumplimiento' : 'Compliance Status'} *
            </label>
            <select
              value={data.complianceStatus || 'PENDING_ASSESSMENT'}
              onChange={(e) => updateData({ complianceStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="PENDING_ASSESSMENT">{isSpanish ? 'Evaluación Pendiente' : 'Pending Assessment'}</option>
              <option value="COMPLIANT">{isSpanish ? 'Cumpliente' : 'Compliant'}</option>
              <option value="UNDER_REVIEW">{isSpanish ? 'En Revisión' : 'Under Review'}</option>
              <option value="NON_COMPLIANT">{isSpanish ? 'No Cumpliente' : 'Non-Compliant'}</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: 'transfers-safeguards',
      title: 'Data Transfers & Safeguards',
      titleEs: 'Transferencias y Salvaguardas',
      description: 'Document international data transfers and safeguards',
      descriptionEs: 'Documente transferencias internacionales y salvaguardas',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={data.transfersToThirdCountries || false}
              onChange={(e) => updateData({ transfersToThirdCountries: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">
              {isSpanish ? '¿Transfiere datos a terceros países?' : 'Does this processor transfer data to third countries?'}
            </label>
          </div>
          {data.transfersToThirdCountries && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Países de Destino' : 'Destination Countries'} *
                </label>
                <input
                  type="text"
                  value={(data.thirdCountries || []).join(', ')}
                  onChange={(e) => updateData({ thirdCountries: e.target.value.split(',').map((c: string) => c.trim()).filter((c: string) => c) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={isSpanish ? 'Ej: Estados Unidos, India' : 'E.g.: United States, India'}
                />
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-semibold mb-2">
                  {isSpanish ? '⚠️ Requisito GDPR:' : '⚠️ GDPR Requirement:'}
                </p>
                <p className="text-sm text-red-700">
                  {isSpanish
                    ? 'Las transferencias a terceros países requieren salvaguardas adecuadas (SCC, BCR, etc.)'
                    : 'Transfers to third countries require adequate safeguards (SCC, BCR, etc.)'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Salvaguardas Implementadas' : 'Safeguards Implemented'}
                </label>
                <div className="space-y-2">
                  {['SCC', 'BCR', 'ADEQUACY', 'CERTIFICATION'].map(safeguard => {
                    const labels: Record<string, { en: string; es: string }> = {
                      'SCC': { en: 'Standard Contractual Clauses', es: 'Cláusulas Contractuales Estándar' },
                      'BCR': { en: 'Binding Corporate Rules', es: 'Reglas Corporativas Vinculantes' },
                      'ADEQUACY': { en: 'Adequacy Decision', es: 'Decisión de Adecuación' },
                      'CERTIFICATION': { en: 'Certification Scheme', es: 'Esquema de Certificación' },
                    };
                    return (
                      <label key={safeguard} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(data.transferSafeguards || []).some((s: any) => s.type === safeguard)}
                          onChange={(e) => {
                            const current = data.transferSafeguards || [];
                            if (e.target.checked) {
                              updateData({
                                transferSafeguards: [...current, { type: safeguard, description: '' }],
                              });
                            } else {
                              updateData({ transferSafeguards: current.filter((s: any) => s.type !== safeguard) });
                            }
                          }}
                          className="mr-2"
                        />
                        <span>{isSpanish ? labels[safeguard]?.es : labels[safeguard]?.en}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      onComplete={onComplete}
      onCancel={onCancel}
      title={isSpanish ? 'Nuevo Procesador de Terceros' : 'New Third Party Processor'}
      titleEs={isSpanish ? 'Nuevo Procesador de Terceros' : 'New Third Party Processor'}
    />
  );
}
