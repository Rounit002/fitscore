import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import ar from './locales/ar/translation.json';
import fr from './locales/fr/translation.json';
import ur from './locales/ur/translation.json';
import ne from './locales/ne/translation.json';
import hi from './locales/hi/translation.json';
import de from './locales/de/translation.json';
import es from './locales/es/translation.json';

// Safety check for legacy language codes stored in client browsers
if (typeof window !== 'undefined') {
  const savedLanguage = window.localStorage.getItem('fitscan_language');
  const supported = ['en', 'ar', 'fr', 'ur', 'ne', 'hi', 'de', 'es'];
  if (savedLanguage && !supported.includes(savedLanguage)) {
    window.localStorage.setItem('fitscan_language', 'en');
  }
}

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  ur: { translation: ur },
  ne: { translation: ne },
  hi: { translation: hi },
  de: { translation: de },
  es: { translation: es },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'fr', 'ur', 'ne', 'hi', 'de', 'es'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fitscan_language',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
