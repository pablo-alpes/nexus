'use client';

/**
 * Sidebar Navigation Component
 * Collapsible sidebar menu for dashboard navigation
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { LanguageToggle } from './LanguageToggle';

interface SidebarProps {
  isChileanPrivacy?: boolean;
}

export default function Sidebar({ isChileanPrivacy = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { language } = useTranslation();
  const isSpanish = language === 'es';

  // Store sidebar state in localStorage for persistence
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const basePath = isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard';
  const brandName = isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud';
  const brandColor = isChileanPrivacy ? 'text-blue-600' : 'text-primary-600';

  // Legal Compliance Section (Cuestionario to Hoja de Ruta)
  const legalComplianceItems = [
    {
      id: 'dashboard',
      label: isSpanish ? 'Panel' : 'Dashboard',
      labelEs: 'Panel',
      icon: '📊',
      path: basePath,
    },
    {
      id: 'questionnaire',
      label: isSpanish ? 'Cuestionario' : 'Questionnaire',
      labelEs: 'Cuestionario',
      icon: '📝',
      path: `${basePath}/questionnaire`,
    },
    {
      id: 'requirements',
      label: isSpanish ? 'Requisitos' : 'Requirements',
      labelEs: 'Requisitos',
      icon: '📋',
      path: `${basePath}/requirements`,
    },
    {
      id: 'controls',
      label: isSpanish ? 'Controles' : 'Controls',
      labelEs: 'Controles',
      icon: '🛡️',
      path: `${basePath}/controls`,
    },
    {
      id: 'rule-engine',
      label: isSpanish ? 'Motor de Reglas' : 'Rule Engine',
      labelEs: 'Motor de Reglas',
      icon: '⚙️',
      path: `${basePath}/rule-engine`,
    },
    {
      id: 'gap-analysis',
      label: isSpanish ? 'Análisis de Brechas' : 'Gap Analysis',
      labelEs: 'Análisis de Brechas',
      icon: '🔍',
      path: `${basePath}/gap-analysis`,
    },
    {
      id: 'remediation',
      label: isSpanish ? 'Remediación' : 'Remediation',
      labelEs: 'Remediación',
      icon: '🔧',
      path: `${basePath}/remediation`,
    },
    {
      id: 'roadmap',
      label: isSpanish ? 'Hoja de Ruta' : 'Roadmap',
      labelEs: 'Hoja de Ruta',
      icon: '🗺️',
      path: `${basePath}/roadmap`,
    },
  ];

  // Privacy Management Section (Derechos Titular to Privacy by Design)
  const privacyManagementItems = isChileanPrivacy ? [
    {
      id: 'data-subject-rights',
      label: isSpanish ? 'Derechos del Titular' : 'Data Subject Rights',
      labelEs: 'Derechos del Titular',
      icon: '👤',
      path: `${basePath}/data-subject-rights`,
    },
    {
      id: 'consent',
      label: isSpanish ? 'Consentimientos' : 'Consent Management',
      labelEs: 'Consentimientos',
      icon: '✅',
      path: `${basePath}/consent`,
    },
    {
      id: 'data-processing-register',
      label: isSpanish ? 'Registro de Tratamiento' : 'Processing Register',
      labelEs: 'Registro de Tratamiento',
      icon: '📑',
      path: `${basePath}/data-processing-register`,
    },
    {
      id: 'breach-notification',
      label: isSpanish ? 'Notificaciones de Brechas' : 'Breach Notification',
      labelEs: 'Notificaciones de Brechas',
      icon: '🚨',
      path: `${basePath}/breach-notification`,
    },
    {
      id: 'third-party-processors',
      label: isSpanish ? 'Procesadores de Terceros' : 'Third Party Processors',
      labelEs: 'Procesadores de Terceros',
      icon: '🤝',
      path: `${basePath}/third-party-processors`,
    },
    {
      id: 'privacy-by-design',
      label: isSpanish ? 'Privacy by Design' : 'Privacy by Design',
      labelEs: 'Privacy by Design',
      icon: '🛡️',
      path: `${basePath}/privacy-by-design`,
    },
    {
      id: 'data-governance',
      label: isSpanish ? 'Gobernanza de Datos' : 'Data Governance',
      labelEs: 'Gobernanza de Datos',
      icon: '📊',
      path: `${basePath}/data-governance`,
    },
    {
      id: 'data-purge',
      label: isSpanish ? 'Purgas de Datos' : 'Data Purge',
      labelEs: 'Purgas de Datos',
      icon: '🗑️',
      path: `${basePath}/data-purge`,
    },
    {
      id: 'privacy-management-dashboard',
      label: isSpanish ? 'Dashboard Privacidad' : 'Privacy Dashboard',
      labelEs: 'Dashboard Privacidad',
      icon: '📈',
      path: `${basePath}/privacy-management`,
    },
  ] : [];

  const isActive = (path: string) => {
    if (path === basePath) {
      return pathname === basePath;
    }
    return pathname?.startsWith(path);
  };

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-screen fixed left-0 top-0 z-40 flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <Link href={basePath} className={`text-xl font-bold ${brandColor}`}>
            {brandName}
          </Link>
        )}
        <button
          onClick={() => {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            localStorage.setItem('sidebar-collapsed', String(newState));
            // Dispatch custom event for layout to listen
            window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: newState } }));
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? (isSpanish ? 'Expandir menú' : 'Expand menu') : (isSpanish ? 'Colapsar menú' : 'Collapse menu')}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Legal Compliance Section */}
        {!isCollapsed && (
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isSpanish ? 'Cumplimiento Legal' : 'Legal Compliance'}
            </h3>
          </div>
        )}
        <ul className="space-y-1 px-2 mb-4">
          {legalComplianceItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.id}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={isCollapsed ? (isSpanish ? item.labelEs : item.label) : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="flex-1">{isSpanish ? item.labelEs : item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Privacy Management Section */}
        {privacyManagementItems.length > 0 && (
          <>
            {!isCollapsed && (
              <div className="px-3 mb-2 mt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {isSpanish ? 'Gestión de Privacidad' : 'Privacy Management'}
                </h3>
              </div>
            )}
            <ul className="space-y-1 px-2">
              {privacyManagementItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={isCollapsed ? (isSpanish ? item.labelEs : item.label) : undefined}
                    >
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <span className="flex-1">{isSpanish ? item.labelEs : item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="mb-3">
            <LanguageToggle />
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <LanguageToggle />
          </div>
        )}
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = isChileanPrivacy ? '/chile-privacy/login' : '/login';
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? (isSpanish ? 'Cerrar sesión' : 'Logout') : undefined}
        >
          <span className="text-xl">🚪</span>
          {!isCollapsed && <span>{isSpanish ? 'Cerrar Sesión' : 'Logout'}</span>}
        </button>
      </div>
    </div>
  );
}
