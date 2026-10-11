'use client'

import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/provider'
import { LANG_COOKIE } from '@/i18n/lang'

// One tap switches FR <-> EN; the active language sits on the orange pill.
export default function LangToggle({ dark = false }: { dark?: boolean }) {
  const { lang, t } = useI18n()
  const router = useRouter()

  const switchLang = () => {
    const next = lang === 'fr' ? 'en' : 'fr'
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  const pill = (code: 'fr' | 'en') =>
    `grid h-10 min-w-[46px] place-items-center rounded-full text-[15px] font-bold ${
      lang === code ? 'bg-sun text-night-900 shadow-[inset_0_-2px_0_#A95700]' : dark ? 'text-night-300' : 'text-muted'
    }`

  return (
    <button
      type="button"
      onClick={switchLang}
      aria-label={t.lang.switchLabel}
      className={`flex rounded-full p-1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun ${
        dark ? 'bg-white/10' : 'bg-sun-50 shadow-[inset_0_0_0_1px_#E7DED3]'
      }`}
    >
      <span className={pill('fr')}>FR</span>
      <span className={pill('en')}>EN</span>
    </button>
  )
}
