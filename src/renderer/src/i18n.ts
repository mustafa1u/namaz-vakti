import i18next from "i18next";
import en from "./i18n/en.json";
import tr from "./i18n/tr.json";

export type UiLanguage = "en" | "tr";
export const UI_LANGUAGE_STORAGE_KEY = "namaz-vakti:ui-language:v1";

function normalizeLanguage(input: string | null | undefined): UiLanguage {
  return input?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export async function initializeI18n(savedLanguage: string | null): Promise<UiLanguage> {
  const language = normalizeLanguage(savedLanguage ?? navigator.language);
  await i18next.init({
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      tr: { translation: tr }
    }
  });
  return language;
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options) as string;
}

export async function setUiLanguage(language: UiLanguage): Promise<void> {
  await i18next.changeLanguage(language);
}

export function getUiLanguage(): UiLanguage {
  return normalizeLanguage(i18next.resolvedLanguage ?? i18next.language);
}

export function getNextUiLanguage(): UiLanguage {
  return getUiLanguage() === "en" ? "tr" : "en";
}

export function translateStaticDocumentText(): void {
  document.documentElement.lang = getUiLanguage();

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) {
      return;
    }
    el.textContent = t(key);
  });

  document.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) {
      return;
    }
    el.setAttribute("placeholder", t(key));
  });
}
