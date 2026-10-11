'use client'

import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/provider'
import { LANG_COOKIE } from '@/i18n/lang'

export default function LangToggle() {
  const { lang, t } = useI18n()
  const router = useRouter()

  const switchLang = () => {
    const next = lang === 'fr' ? 'en' : 'fr'
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={switchLang}
      aria-label={t.lang.switchLabel}
      className="min-h-11 min-w-11 px-3 rounded-lg border border-gray-300 text-base font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
    >
      {t.lang.switchTo}
    </button>
  )
}
