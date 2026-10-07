import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage';

/** @typedef {'system' | 'light' | 'dark'} ThemePreference */

/**
 * Inline script for <head>: applies the saved theme before first paint so there is no flash.
 * Kept tiny and dependency-free on purpose.
 */
export const THEME_INIT_SCRIPT = `try{var t=JSON.parse(localStorage.getItem('${STORAGE_KEYS.theme}'));if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

/** @returns {ThemePreference} */
export function getThemePreference() {
  const t = readJson(STORAGE_KEYS.theme, 'system');
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** @param {ThemePreference} pref */
export function setThemePreference(pref) {
  writeJson(STORAGE_KEYS.theme, pref);
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
}
