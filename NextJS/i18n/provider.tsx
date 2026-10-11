'use client'

import { createContext, useContext, useEffect } from 'react'
import type { Dict } from './dictionary'
import type { Lang } from './lang'

type Value = { lang: Lang; t: Dict }

const I18nContext = createContext<Value | null>(null)

// Only the active language's strings are sent to the browser.
export function I18nProvider({ lang, t, children }: Value & { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): Value {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
