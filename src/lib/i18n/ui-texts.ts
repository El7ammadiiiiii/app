export type UiLocale = "ar" | "en";

export type UiTexts = {
  selectPlaceholder: string;
  selectModalTitleFallback: string;
  selectSearchPlaceholder: string;
  selectEmptyLabel: string;
  closeLabel: string;
};

const UI_TEXTS: Record<UiLocale, UiTexts> = {
  ar: {
    selectPlaceholder: "اختر...",
    selectModalTitleFallback: "اختر",
    selectSearchPlaceholder: "ابحث...",
    selectEmptyLabel: "لا توجد نتائج",
    closeLabel: "إغلاق",
  },
  en: {
    selectPlaceholder: "Select…",
    selectModalTitleFallback: "Select",
    selectSearchPlaceholder: "Search…",
    selectEmptyLabel: "No results",
    closeLabel: "Close",
  },
};

function normalizeUiLocale(value: string | null | undefined): UiLocale {
  if (!value) return "ar";

  const base = value.trim().toLowerCase().split("-")[0];
  return base === "en" ? "en" : "ar";
}

/**
 * UI locale resolution (no LocaleProvider required):
 * - If storeLanguage exists: use it if it's ar/en else fallback to ar
 * - Else use documentLang if it's ar/en else ar
 * - Else ar
 */
export function resolveUiLocale(options?: {
  storeLanguage?: string | null;
  documentLang?: string | null;
}): UiLocale {
  const storeLanguage = options?.storeLanguage;
  if (storeLanguage) return normalizeUiLocale(storeLanguage);

  const documentLang = options?.documentLang;
  if (documentLang) return normalizeUiLocale(documentLang);

  return "ar";
}

export function getUiTexts(locale: UiLocale): UiTexts {
  return UI_TEXTS[locale] ?? UI_TEXTS.ar;
}
