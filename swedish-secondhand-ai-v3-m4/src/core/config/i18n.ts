import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '@/locales/en/common.json';
import svCommon from '@/locales/sv/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      sv: { common: svCommon },
    },
    fallbackLng: 'sv',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'swedish-secondhand-ai-language',
      caches: ['localStorage'],
    },
  });

export async function setAppLanguage(lang: 'sv' | 'en'): Promise<void> {
  document.documentElement.lang = lang;
  await i18n.changeLanguage(lang);
}

export { i18n };
