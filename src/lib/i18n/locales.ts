/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOCALES CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * تعريف اللغات المدعومة في النظام
 * Default: العربية (ar)
 * 
 * @version 1.0.0
 */

export type LocaleCode = 'ar' | 'en' | 'fr' | 'es' | 'de' | 'tr' | 'ru' | 'zh' | 'ja' | 'ko';

export interface LocaleConfig {
  code: LocaleCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

export const LOCALES: Record<LocaleCode, LocaleConfig> = {
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇸🇦',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    flag: '🇩🇪',
  },
  tr: {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    flag: '🇹🇷',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    flag: '🇷🇺',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    flag: '🇨🇳',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    flag: '🇯🇵',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    flag: '🇰🇷',
  },
};

export const DEFAULT_LOCALE: LocaleCode = 'ar';

export const LOCALE_LIST = Object.values(LOCALES);

export function isRTL(locale: LocaleCode): boolean {
  return LOCALES[locale]?.direction === 'rtl';
}

export function getLocaleConfig(locale: LocaleCode): LocaleConfig {
  return LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
}
