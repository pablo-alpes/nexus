'use client';

import { useTranslation } from '@/lib/hooks/useTranslation';

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('es')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'es'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        ES
      </button>
    </div>
  );
}
