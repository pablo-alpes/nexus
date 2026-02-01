'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegulationType, getAllRegulations, getRegulationConfig } from '@/lib/regulations';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface RegulationSelectorProps {
  currentRegulation?: RegulationType;
  onRegulationChange?: (regulation: RegulationType) => void;
}

export function RegulationSelector({ currentRegulation, onRegulationChange }: RegulationSelectorProps) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [selectedRegulation, setSelectedRegulation] = useState<RegulationType>(
    currentRegulation || RegulationType.DORA
  );

  const regulations = getAllRegulations();

  const handleChange = (regulationType: RegulationType) => {
    setSelectedRegulation(regulationType);
    
    if (onRegulationChange) {
      onRegulationChange(regulationType);
    } else {
      // Default behavior: navigate to regulation-specific page
      if (regulationType === RegulationType.CHILEAN_PRIVACY) {
        router.push('/chilean-privacy');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700">
        {language === 'es' ? 'Regulación:' : 'Regulation:'}
      </label>
      <select
        value={selectedRegulation}
        onChange={(e) => handleChange(e.target.value as RegulationType)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
      >
        {regulations.map((reg) => {
          const name = language === 'es' && reg.nameEs ? reg.nameEs : reg.name;
          return (
            <option key={reg.type} value={reg.type}>
              {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}
