import config from 'virtual:deckspring/config';
import { useSyncExternalStore } from 'react';
import { ar } from '../../locale/ar';
import { en } from '../../locale/en';
import type { Locale } from '../../locale/types';

export type LocaleId = Locale['id'];

const LOCALES: Record<LocaleId, Locale> = {
  en,
  ar,
};

export const LOCALE_OPTIONS: ReadonlyArray<{ id: LocaleId; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
];

const STORAGE_KEY = 'deckspring:locale';
const configLocale = config.locale as Locale | undefined;

function isLocaleId(value: string | null): value is LocaleId {
  return value === 'en' || value === 'ar';
}

function readStored(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocaleId(stored)) return LOCALES[stored];
  } catch {}
  return configLocale && isLocaleId(configLocale.id) ? configLocale : en;
}

function syncDocument(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale.id;
  document.documentElement.dir = locale.id === 'ar' ? 'rtl' : 'ltr';
}

// A module-level store (rather than React context) so every React root the
// runtime mounts — the app shell plus the standalone roots used for HTML/PDF
// export — shares one locale without needing a provider above each of them.
let current: Locale = readStored();
syncDocument(current);
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return current;
}

export function setLocale(id: LocaleId): void {
  current = LOCALES[id];
  syncDocument(current);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  for (const listener of listeners) listener();
}

export function useLocaleValue(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
