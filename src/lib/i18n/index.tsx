import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import en from './en.json';
import ja from './ja.json';

export type Lang = 'en' | 'ja';

type Translations = typeof en;

const TRANSLATIONS: Record<Lang, Translations> = { en, ja };

// "selectedLanguage" is the canonical gate key — presence means user has chosen.
// "bonda_lang" is used only for subsequent profile-level switches after first choice.
const SELECTED_KEY = 'selectedLanguage';
const STORAGE_KEY = 'bonda_lang';

function readChosenLang(): Lang | null {
  const v = localStorage.getItem(SELECTED_KEY);
  if (v === 'en' || v === 'ja') return v;
  return null;
}

function detectLang(): Lang {
  // Only read a stored preference; never fall back to browser language
  // so that we never silently skip the language screen.
  const chosen = readChosenLang();
  if (chosen) return chosen;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ja') return stored;
  return 'en'; // fallback for rendering only — screen will still appear
}

interface I18nCtx {
  lang: Lang;
  langChosen: boolean;
  setLang: (l: Lang) => void;
  chooseLang: (l: Lang) => void;
  t: (key: keyof Translations, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  // langChosen is ONLY true when selectedLanguage exists in localStorage
  const [langChosen, setLangChosen] = useState(() => readChosenLang() !== null);

  // Silent language switch (used by profile toggle after first choice)
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    // Keep selectedLanguage in sync so the gate stays open
    localStorage.setItem(SELECTED_KEY, l);
    setLangState(l);
  }, []);

  // Explicit first-time choice — writes selectedLanguage, unlocking the gate
  const chooseLang = useCallback((l: Lang) => {
    localStorage.setItem(SELECTED_KEY, l);
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
    setLangChosen(true);
  }, []);

  const t = useCallback(
    (key: keyof Translations, vars?: Record<string, string | number>): string => {
      let str: string = TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replaceAll(`{{${k}}}`, String(v));
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, langChosen, setLang, chooseLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
