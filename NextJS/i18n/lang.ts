// Kept free of the dictionaries so client components can import it without shipping both languages.

export type Lang = 'fr' | 'en'

export const LANG_COOKIE = 'anzi_lang'
export const DEFAULT_LANG: Lang = 'fr'

const isLang = (value: unknown): value is Lang => value === 'fr' || value === 'en'

// Saved choice first; otherwise English only when the browser asks for it first; otherwise French.
export function resolveLang(cookieValue: string | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(cookieValue)) return cookieValue
  const first = (acceptLanguage ?? '').split(',')[0]?.trim().toLowerCase() ?? ''
  return first.startsWith('en') ? 'en' : DEFAULT_LANG
}

// "Étape {n} sur {total}" -> "Étape 2 sur 4". Unknown placeholders are left as they are.
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole))
}
