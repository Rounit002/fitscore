/**
 * Supported UI languages, labelled with each language's own endonym.
 *
 * Single source of truth. This list previously existed twice — in
 * LanguageSwitcher.jsx and again in Profile.jsx — and the two copies drifted:
 * the Profile copy had been saved with its UTF-8 bytes decoded as latin1, so the
 * profile language picker offered "FranÃ§ais" and "Ø¹Ø±Ø¨ÙŠ" while the header
 * switcher rendered the same eight languages correctly. A language chooser that
 * cannot spell its own languages fails exactly the users who need it, and a
 * duplicated list is what allowed one copy to rot unnoticed.
 *
 * Codes must stay in step with the resource bundles in src/i18n/locales.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'عربي' },
  { code: 'ur', label: 'اردو' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

export default LANGUAGES;
