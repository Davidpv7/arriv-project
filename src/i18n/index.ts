import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';

export const defaultNS = 'translation';
export const resources = { en: { translation: en } } as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
  }
}

// English only in v1. When translations arrive, pick the language with
// expo-localization's getLocales() and fall back to 'en'.
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
