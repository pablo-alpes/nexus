'use client';

/**
 * Privacy Management Dashboard
 * Overview of all privacy management activities
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';
import Link from 'next/link';

interface DashboardStats {
  dataSubjectRequests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  consents: {
    total: number;
    given: number;
    withdrawn: number;
    expired: number;
  };
  breachNotifications: {
    total: number;
    detected: number;
    investigating: number;
    resolved: number;
    critical: number;
  };
  privacyProjects: {
    total: number;
    inProgress: number;
    dpiaRequired: number;
    compliant: number;
    nonCompliant: number;
  };
  thirdPartyProcessors: {
    total: number;
    active: number;
    compliant: number;
    highRisk: number;
  };
  processingActivities: {
    total: number;
    active: number;
    requiringConsent: number;
  };
}

export default function PrivacyManagementDashboard() {
  const { language, t } = useTranslation();
  const isSpanish = language === 'es';
  const regulationType = RegulationType.CHILEAN_PRIVACY;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentBreaches, setRecentBreaches] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [requestsRes, consentsRes, breachesRes, projectsRes, processorsRes, activitiesRes] = await Promise.all([
        apiRequest<{ requests: any[] }>(`/data-subject-requests?regulation=${String(regulationType)}`),
        apiRequest<{ consents: any[] }>(`/consent?regulation=${String(regulationType)}`),
        apiRequest<{ breaches: any[] }>(`/breach-notification?regulation=${String(regulationType)}`),
        apiRequest<{ projects: any[] }>(`/privacy-by-design-projects?regulation=${String(regulationType)}`),
        apiRequest<{ processors: any[] }>(`/third-party-processors?regulation=${String(regulationType)}`),
        apiRequest<{ activities: any[] }>(`/data-processing-register?regulation=${String(regulationType)}`),
      ]);

      const requests = requestsRes.requests || [];
      const consents = consentsRes.consents || [];
      const breaches = breachesRes.breaches || [];
      const projects = projectsRes.projects || [];
      const processors = processorsRes.processors || [];
      const activities = activitiesRes.activities || [];

      // Calculate stats
      const now = new Date();
      const statsData: DashboardStats = {
        dataSubjectRequests: {
          total: requests.length,
          pending: requests.filter((r: any) => r.status === 'PENDING').length,
          inProgress: requests.filter((r: any) => r.status === 'IN_PROGRESS').length,
          completed: requests.filter((r: any) => r.status === 'COMPLETED').length,
          overdue: requests.filter((r: any) => {
            if (r.status === 'COMPLETED' || r.status === 'CANCELLED') return false;
            const dueDate = new Date(r.dueDate);
            return dueDate < now;
          }).length,
        },
        consents: {
          total: consents.length,
          given: consents.filter((c: any) => c.consentStatus === 'GIVEN').length,
          withdrawn: consents.filter((c: any) => c.consentStatus === 'WITHDRAWN').length,
          expired: consents.filter((c: any) => c.consentStatus === 'EXPIRED').length,
        },
        breachNotifications: {
          total: breaches.length,
          detected: breaches.filter((b: any) => b.status === 'DETECTED').length,
          investigating: breaches.filter((b: any) => b.status === 'INVESTIGATING').length,
          resolved: breaches.filter((b: any) => b.status === 'RESOLVED').length,
          critical: breaches.filter((b: any) => b.severity === 'CRITICAL').length,
        },
        privacyProjects: {
          total: projects.length,
          inProgress: projects.filter((p: any) => p.status === 'IN_PROGRESS').length,
          dpiaRequired: projects.filter((p: any) => p.dpiaRequired).length,
          compliant: projects.filter((p: any) => p.complianceStatus === 'COMPLIANT').length,
          nonCompliant: projects.filter((p: any) => p.complianceStatus === 'NON_COMPLIANT').length,
        },
        thirdPartyProcessors: {
          total: processors.length,
          active: processors.filter((p: any) => p.status === 'ACTIVE').length,
          compliant: processors.filter((p: any) => p.complianceStatus === 'COMPLIANT').length,
          highRisk: processors.filter((p: any) => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL').length,
        },
        processingActivities: {
          total: activities.length,
          active: activities.filter((a: any) => a.status === 'ACTIVE').length,
          requiringConsent: activities.filter((a: any) => a.consentRequired).length,
        },
      };

      setStats(statsData);

      // Get recent items
      setRecentRequests(requests
        .sort((a: any, b: any) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime())
        .slice(0, 5));
      setRecentBreaches(breaches
        .sort((a: any, b: any) => new Date(b.breachDate).getTime() - new Date(a.breachDate).getTime())
        .slice(0, 5));
      setRecentProjects(projects
        .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, titleEs, value, icon, color, link }: { title: string; titleEs: string; value: number; icon: string; color: string; link?: string }) => {
    const content = (
      <div className={`bg-white rounded-lg shadow p-6 ${link ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{isSpanish ? titleEs : title}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
          <div className={`text-4xl ${color}`}>{icon}</div>
        </div>
      </div>
    );

    if (link) {
      return <Link href={link}>{content}</Link>;
    }
    return content;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">{isSpanish ? 'Cargando...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">{isSpanish ? 'No hay datos disponibles' : 'No data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isSpanish ? 'Dashboard de Gestión de Privacidad' : 'Privacy Management Dashboard'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSpanish 
              ? 'Vista general de todas las actividades de gestión de privacidad'
              : 'Overview of all privacy management activities'}
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Data Subject Requests"
            titleEs="Solicitudes de Titulares"
            value={stats.dataSubjectRequests.total}
            icon="👤"
            color="text-blue-600"
            link="/chile-privacy/dashboard/data-subject-rights"
          />
          <StatCard
            title="Consents"
            titleEs="Consentimientos"
            value={stats.consents.total}
            icon="✅"
            color="text-green-600"
            link="/chile-privacy/dashboard/consent"
          />
          <StatCard
            title="Breach Notifications"
            titleEs="Notificaciones de Brechas"
            value={stats.breachNotifications.total}
            icon="🚨"
            color="text-red-600"
            link="/chile-privacy/dashboard/breach-notification"
          />
          <StatCard
            title="Privacy Projects"
            titleEs="Proyectos de Privacidad"
            value={stats.privacyProjects.total}
            icon="🛡️"
            color="text-purple-600"
            link="/chile-privacy/dashboard/privacy-by-design"
          />
          <StatCard
            title="Third Party Processors"
            titleEs="Procesadores de Terceros"
            value={stats.thirdPartyProcessors.total}
            icon="🤝"
            color="text-orange-600"
            link="/chile-privacy/dashboard/third-party-processors"
          />
          <StatCard
            title="Processing Activities"
            titleEs="Actividades de Tratamiento"
            value={stats.processingActivities.total}
            icon="📑"
            color="text-indigo-600"
            link="/chile-privacy/dashboard/data-processing-register"
          />
        </div>

        {/* Status Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{isSpanish ? 'Resumen del Estado Principal' : 'Main Status Summary'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Status */}
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">{isSpanish ? 'Estado General' : 'Overall Status'}</p>
              <p className="text-2xl font-bold mt-1">
                {stats.dataSubjectRequests.overdue > 0 || stats.breachNotifications.critical > 0 || stats.privacyProjects.nonCompliant > 0
                  ? <span className="text-red-600">{isSpanish ? '⚠️ Atención Requerida' : '⚠️ Attention Required'}</span>
                  : <span className="text-green-600">{isSpanish ? '✅ En Orden' : '✅ All Good'}</span>
                }
              </p>
            </div>
            
            {/* Active Items */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="text-sm text-gray-600">{isSpanish ? 'Items Activos' : 'Active Items'}</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">
                {stats.dataSubjectRequests.pending + stats.dataSubjectRequests.inProgress + stats.breachNotifications.detected + stats.breachNotifications.investigating + stats.privacyProjects.inProgress}
              </p>
            </div>
            
            {/* Completed Items */}
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">{isSpanish ? 'Completados' : 'Completed'}</p>
              <p className="text-2xl font-bold mt-1 text-green-600">
                {stats.dataSubjectRequests.completed + stats.breachNotifications.resolved + stats.privacyProjects.compliant}
              </p>
            </div>
            
            {/* Critical Items */}
            <div className="border-l-4 border-red-500 pl-4">
              <p className="text-sm text-gray-600">{isSpanish ? 'Críticos' : 'Critical'}</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {stats.dataSubjectRequests.overdue + stats.breachNotifications.critical + stats.privacyProjects.nonCompliant}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Data Subject Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{isSpanish ? 'Solicitudes de Titulares' : 'Data Subject Requests'}</h2>
              <Link href="/chile-privacy/dashboard/data-subject-rights" className="text-blue-600 hover:text-blue-800 text-sm">
                {isSpanish ? 'Ver todas →' : 'View all →'}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Pendientes' : 'Pending'}</span>
                <span className="font-semibold text-yellow-600">{stats.dataSubjectRequests.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'En Progreso' : 'In Progress'}</span>
                <span className="font-semibold text-blue-600">{stats.dataSubjectRequests.inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Completadas' : 'Completed'}</span>
                <span className="font-semibold text-green-600">{stats.dataSubjectRequests.completed}</span>
              </div>
              {stats.dataSubjectRequests.overdue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{isSpanish ? 'Vencidas' : 'Overdue'}</span>
                  <span className="font-semibold text-red-600">{stats.dataSubjectRequests.overdue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Consents */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{isSpanish ? 'Consentimientos' : 'Consents'}</h2>
              <Link href="/chile-privacy/dashboard/consent" className="text-blue-600 hover:text-blue-800 text-sm">
                {isSpanish ? 'Ver todos →' : 'View all →'}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Otorgados' : 'Given'}</span>
                <span className="font-semibold text-green-600">{stats.consents.given}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Retirados' : 'Withdrawn'}</span>
                <span className="font-semibold text-red-600">{stats.consents.withdrawn}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Expirados' : 'Expired'}</span>
                <span className="font-semibold text-gray-600">{stats.consents.expired}</span>
              </div>
            </div>
          </div>

          {/* Breach Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{isSpanish ? 'Notificaciones de Brechas' : 'Breach Notifications'}</h2>
              <Link href="/chile-privacy/dashboard/breach-notification" className="text-blue-600 hover:text-blue-800 text-sm">
                {isSpanish ? 'Ver todas →' : 'View all →'}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Detectadas' : 'Detected'}</span>
                <span className="font-semibold text-orange-600">{stats.breachNotifications.detected}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'En Investigación' : 'Investigating'}</span>
                <span className="font-semibold text-blue-600">{stats.breachNotifications.investigating}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Resueltas' : 'Resolved'}</span>
                <span className="font-semibold text-green-600">{stats.breachNotifications.resolved}</span>
              </div>
              {stats.breachNotifications.critical > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{isSpanish ? 'Críticas' : 'Critical'}</span>
                  <span className="font-semibold text-red-600">{stats.breachNotifications.critical}</span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Projects */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{isSpanish ? 'Proyectos de Privacidad' : 'Privacy Projects'}</h2>
              <Link href="/chile-privacy/dashboard/privacy-by-design" className="text-blue-600 hover:text-blue-800 text-sm">
                {isSpanish ? 'Ver todos →' : 'View all →'}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'En Progreso' : 'In Progress'}</span>
                <span className="font-semibold text-blue-600">{stats.privacyProjects.inProgress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Requieren DPIA' : 'DPIA Required'}</span>
                <span className="font-semibold text-orange-600">{stats.privacyProjects.dpiaRequired}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isSpanish ? 'Conformes' : 'Compliant'}</span>
                <span className="font-semibold text-green-600">{stats.privacyProjects.compliant}</span>
              </div>
              {stats.privacyProjects.nonCompliant > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{isSpanish ? 'No Conformes' : 'Non-Compliant'}</span>
                  <span className="font-semibold text-red-600">{stats.privacyProjects.nonCompliant}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">{isSpanish ? 'Solicitudes Recientes' : 'Recent Requests'}</h3>
            <div className="space-y-3">
              {recentRequests.length === 0 ? (
                <p className="text-gray-500 text-sm">{isSpanish ? 'No hay solicitudes' : 'No requests'}</p>
              ) : (
                recentRequests.map((request: any) => (
                  <div key={request._id} className="border-l-4 border-blue-500 pl-3">
                    <p className="text-sm font-medium">{request.dataSubjectName || request.dataSubjectEmail}</p>
                    <p className="text-xs text-gray-500">{request.requestType}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(request.createdAt || request._id).toLocaleDateString(isSpanish ? 'es-CL' : 'en-US')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Breaches */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">{isSpanish ? 'Brechas Recientes' : 'Recent Breaches'}</h3>
            <div className="space-y-3">
              {recentBreaches.length === 0 ? (
                <p className="text-gray-500 text-sm">{isSpanish ? 'No hay brechas' : 'No breaches'}</p>
              ) : (
                recentBreaches.map((breach: any) => (
                  <div key={breach._id} className="border-l-4 border-red-500 pl-3">
                    <p className="text-sm font-medium">{breach.incidentTitle}</p>
                    <p className="text-xs text-gray-500">
                      {breach.severity} - {breach.status}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(breach.breachDate).toLocaleDateString(isSpanish ? 'es-CL' : 'en-US')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">{isSpanish ? 'Proyectos Recientes' : 'Recent Projects'}</h3>
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <p className="text-gray-500 text-sm">{isSpanish ? 'No hay proyectos' : 'No projects'}</p>
              ) : (
                recentProjects.map((project: any) => (
                  <div key={project._id} className="border-l-4 border-purple-500 pl-3">
                    <p className="text-sm font-medium">{project.projectName}</p>
                    <p className="text-xs text-gray-500">
                      {project.status} - {project.riskLevel}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {project.projectOwner}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
