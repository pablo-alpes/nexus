'use client';

import { useState, useEffect } from 'react';
import { getCurrentLanguage, setCurrentLanguage, t, Language } from '../i18n';

/**
 * React hook for translations (client-side only)
 */
export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());
  
  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguageState(e.detail.language);
    };
    
    window.addEventListener('languagechange', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange as EventListener);
    };
  }, []);
  
  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    setLanguageState(lang);
  };
  
  return {
    t: (key: string) => t(key, language),
    language,
    setLanguage,
  };
}
