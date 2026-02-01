'use client';

/**
 * Data Governance Wizard
 * Interactive wizard for creating data governance records
 */

import Wizard from '../Wizard';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useState } from 'react';

interface DataGovernanceWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function DataGovernanceWizard({ onComplete, onCancel }: DataGovernanceWizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const [conceptualDataTypes, setConceptualDataTypes] = useState<string[]>([]);
  const [keySystems, setKeySystems] = useState<string[]>([]);
  const [dataCategories, setDataCategories] = useState<string[]>([]);

  const steps = [
    {
      id: 'business-process',
      title: 'Business Process',
      titleEs: 'Proceso de Negocio',
      description: 'Business process information',
      descriptionEs: 'Información del proceso de negocio',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Proceso de Negocio' : 'Business Process'} *
            </label>
            <input
              type="text"
              value={data.businessProcess || ''}
              onChange={(e) => updateData({ businessProcess: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={isSpanish ? 'Ej: Gestión de Clientes' : 'E.g.: Customer Management'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Descripción del Proceso' : 'Process Description'}
            </label>
            <textarea
              value={data.businessProcessDescription || ''}
              onChange={(e) => updateData({ businessProcessDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder={isSpanish ? 'Describa el proceso de negocio' : 'Describe the business process'}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'data-ownership',
      title: 'Data Ownership',
      titleEs: 'Propiedad de Datos',
      description: 'Data owner, steward, and custodian',
      descriptionEs: 'Propietario, administrador y custodio de datos',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">{isSpanish ? 'Data Owner' : 'Data Owner'} *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Nombre' : 'Name'} *
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
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Departamento' : 'Department'}
                </label>
                <input
                  type="text"
                  value={data.dataOwner?.department || ''}
                  onChange={(e) => updateData({ dataOwner: { ...data.dataOwner, department: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Rol' : 'Role'}
                </label>
                <input
                  type="text"
                  value={data.dataOwner?.role || ''}
                  onChange={(e) => updateData({ dataOwner: { ...data.dataOwner, role: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">{isSpanish ? 'Data Steward' : 'Data Steward'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Nombre' : 'Name'}
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
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Departamento' : 'Department'}
                </label>
                <input
                  type="text"
                  value={data.dataSteward?.department || ''}
                  onChange={(e) => updateData({ dataSteward: { ...data.dataSteward, department: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Rol' : 'Role'}
                </label>
                <input
                  type="text"
                  value={data.dataSteward?.role || ''}
                  onChange={(e) => updateData({ dataSteward: { ...data.dataSteward, role: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">{isSpanish ? 'Data Custodian' : 'Data Custodian'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={data.dataCustodian?.name || ''}
                  onChange={(e) => updateData({ dataCustodian: { ...data.dataCustodian, name: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Email' : 'Email'}
                </label>
                <input
                  type="email"
                  value={data.dataCustodian?.email || ''}
                  onChange={(e) => updateData({ dataCustodian: { ...data.dataCustodian, email: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Departamento' : 'Department'}
                </label>
                <input
                  type="text"
                  value={data.dataCustodian?.department || ''}
                  onChange={(e) => updateData({ dataCustodian: { ...data.dataCustodian, department: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Rol' : 'Role'}
                </label>
                <input
                  type="text"
                  value={data.dataCustodian?.role || ''}
                  onChange={(e) => updateData({ dataCustodian: { ...data.dataCustodian, role: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'data-systems',
      title: 'Data Types & Systems',
      titleEs: 'Tipos de Datos y Sistemas',
      description: 'Conceptual data types and key systems',
      descriptionEs: 'Tipos de datos conceptuales y sistemas clave',
      component: ({ data, updateData }: any) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Tipos de Datos Conceptuales' : 'Conceptual Data Types'} *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value && !conceptualDataTypes.includes(value)) {
                      const newTypes = [...conceptualDataTypes, value];
                      setConceptualDataTypes(newTypes);
                      updateData({ conceptualDataTypes: newTypes });
                      e.target.value = '';
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder={isSpanish ? 'Ej: Datos de Clientes, Datos Financieros' : 'E.g.: Customer Data, Financial Data'}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {conceptualDataTypes.map((type, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {type}
                  <button
                    type="button"
                    onClick={() => {
                      const newTypes = conceptualDataTypes.filter((_, i) => i !== idx);
                      setConceptualDataTypes(newTypes);
                      updateData({ conceptualDataTypes: newTypes });
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSpanish ? 'Categorías de Datos' : 'Data Categories'}
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
                placeholder={isSpanish ? 'Ej: PERSONAL, SENSIBLE, FINANCIERO' : 'E.g.: PERSONAL, SENSITIVE, FINANCIAL'}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {dataCategories.map((cat, idx) => (
                <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {cat}
                  <button
                    type="button"
                    onClick={() => {
                      const newCategories = dataCategories.filter((_, i) => i !== idx);
                      setDataCategories(newCategories);
                      updateData({ dataCategories: newCategories });
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
  ];

  return (
    <Wizard
      steps={steps}
      onComplete={onComplete}
      onCancel={onCancel}
      title={isSpanish ? 'Nuevo Registro de Gobernanza' : 'New Governance Record'}
      titleEs="Nuevo Registro de Gobernanza"
    />
  );
}
