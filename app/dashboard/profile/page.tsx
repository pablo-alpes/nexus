'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RegulationType, getRegulationModules } from '@/lib/regulations';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { LanguageToggle } from '@/components/LanguageToggle';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  company?: string;
  preferredRegulation: RegulationType;
  enabledRegulations: RegulationType[];
}

interface RegulationModuleInfo {
  id: RegulationType;
  name: string;
  nameEs?: string;
  description: string;
  routePrefix: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useTranslation();
  const isChileanPrivacy = pathname?.includes('chile-privacy') || pathname?.includes('chilean-privacy');
  const isSpanish = language === 'es';

  const [activeTab, setActiveTab] = useState<'account' | 'regulations'>('account');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<RegulationModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', company: '' });
  const [preferredRegulation, setPreferredRegulation] = useState<RegulationType>(RegulationType.DORA);
  const [enabledRegulations, setEnabledRegulations] = useState<RegulationType[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(isChileanPrivacy ? '/chile-privacy/login' : '/login');
      return;
    }
    loadProfile();
    loadModules();
  }, [router, isChileanPrivacy]);

  const loadProfile = async () => {
    try {
      const data = await apiRequest<UserProfile>('/user/profile');
      setProfile(data);
      setAccountForm({ name: data.name, company: data.company ?? '' });
      setPreferredRegulation(data.preferredRegulation ?? RegulationType.DORA);
      setEnabledRegulations(data.enabledRegulations ?? [RegulationType.DORA, RegulationType.CHILEAN_PRIVACY]);
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const res = await apiRequest<{ modules: RegulationModuleInfo[] }>('/regulations/modules');
      setModules(res.modules ?? getRegulationModules());
    } catch {
      setModules(getRegulationModules());
    }
  };

  const handleSaveRegulations = async () => {
    setSaving(true);
    try {
      const updated = await apiRequest<UserProfile>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          preferredRegulation: preferredRegulation,
          enabledRegulations: enabledRegulations,
        }),
      });
      setProfile(updated);
      if (enabledRegulations.length > 0 && !enabledRegulations.includes(preferredRegulation)) {
        setPreferredRegulation(enabledRegulations[0]);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleRegulation = (id: RegulationType) => {
    setEnabledRegulations((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const basePath = isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard';
  const dashboardLabel = isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href={basePath} className={`text-2xl font-bold ${isChileanPrivacy ? 'text-blue-600' : 'text-primary-600'}`}>
                {dashboardLabel}
              </Link>
              <Link href={`${basePath}/profile`} className="text-gray-700 hover:text-primary-600 font-medium">
                {isSpanish ? 'Perfil' : 'Profile'}
              </Link>
            </div>
            <div className="flex items-center">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isSpanish ? 'Configuración de cuenta' : 'Account settings'}
        </h1>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'account'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {isSpanish ? 'Cuenta' : 'Account'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('regulations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'regulations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {isSpanish ? 'Módulo de regulación' : 'Regulation module'}
          </button>
        </div>

        {activeTab === 'account' && profile && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">{profile.email}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isSpanish ? 'Nombre' : 'Name'}</label>
            <input
              type="text"
              value={accountForm.name}
              onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">{isSpanish ? 'Empresa' : 'Company'}</label>
            <input
              type="text"
              value={accountForm.company}
              onChange={(e) => setAccountForm((p) => ({ ...p, company: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <p className="text-sm text-gray-500 mt-4">
              {isSpanish ? 'La actualización de nombre y empresa se implementará en una próxima versión.' : 'Name and company update will be available in a future release.'}
            </p>
          </div>
        )}

        {activeTab === 'regulations' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">
              {isSpanish
                ? 'Elija qué módulos de regulación desea ver en la navegación y cuál es su módulo principal (dashboard por defecto).'
                : 'Choose which regulation modules to show in navigation and your primary module (default dashboard).'}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Módulos habilitados' : 'Enabled modules'}
                </label>
                <div className="space-y-2">
                  {modules.map((mod) => (
                    <label key={mod.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledRegulations.includes(mod.id)}
                        onChange={() => toggleRegulation(mod.id)}
                        className="mt-1 rounded border-gray-300"
                      />
                      <div>
                        <span className="font-medium">{isSpanish && mod.nameEs ? mod.nameEs : mod.name}</span>
                        <p className="text-sm text-gray-500">{mod.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isSpanish ? 'Módulo principal (dashboard por defecto)' : 'Primary module (default dashboard)'}
                </label>
                <select
                  value={preferredRegulation}
                  onChange={(e) => setPreferredRegulation(e.target.value as RegulationType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {modules.filter((m) => enabledRegulations.includes(m.id)).map((m) => (
                    <option key={m.id} value={m.id}>
                      {isSpanish && m.nameEs ? m.nameEs : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveRegulations}
                disabled={saving || enabledRegulations.length === 0}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? (isSpanish ? 'Guardando...' : 'Saving...') : isSpanish ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
