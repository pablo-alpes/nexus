/**
 * Internationalization (i18n) Support
 * Provides language switching between English and Spanish
 */

export type Language = 'en' | 'es';

export interface Translations {
  [key: string]: string | Translations;
}

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

// Supported languages
export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es'];

/**
 * Get current language from localStorage or default
 */
export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  
  const stored = localStorage.getItem('language') as Language;
  return stored && SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
}

/**
 * Set current language
 */
export function setCurrentLanguage(language: Language): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  if (SUPPORTED_LANGUAGES.includes(language)) {
    localStorage.setItem('language', language);
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
  }
}

/**
 * Translation keys for common UI elements
 */
export const COMMON_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Login',
    'nav.register': 'Sign Up',
    'nav.logout': 'Logout',
    'nav.language': 'Language',
    'button.getStarted': 'Get Started Free',
    'button.signIn': 'Sign In',
    'button.startTrial': 'Start Free Trial',
    'footer.legal': 'Legal',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.disclaimer': 'Disclaimer',
    'footer.copyright': 'All rights reserved',
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'nav.logout': 'Cerrar Sesión',
    'nav.language': 'Idioma',
    'button.getStarted': 'Comenzar Gratis',
    'button.signIn': 'Iniciar Sesión',
    'button.startTrial': 'Comenzar Prueba Gratuita',
    'footer.legal': 'Legal',
    'footer.terms': 'Términos de Servicio',
    'footer.privacy': 'Política de Privacidad',
    'footer.disclaimer': 'Descargo de Responsabilidad',
    'footer.copyright': 'Todos los derechos reservados',
  },
};

/**
 * Get translation for a key
 */
export function t(key: string, language?: Language): string {
  const lang = language || getCurrentLanguage();
  const keys = key.split('.');
  let value: any = COMMON_TRANSLATIONS[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  return typeof value === 'string' ? value : key;
}

/**
 * Get translation for a key with language parameter
 */
export function translate(key: string, language?: Language): string {
  return t(key, language);
}
