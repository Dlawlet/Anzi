import Link from 'next/link'
import { getI18n } from '@/i18n/server'
import Logo from './logo'

export default async function Credits() {
  const { t } = await getI18n()
  return (
    <footer className="col-wide px-4 pt-1">
      <div className="flex items-center gap-3 border-t border-line pb-2 pt-4 text-sm text-muted">
        <Logo size={36} onDark />
        <div>
          <b className="text-night-900">{t.brand}</b> · {t.home.credits}
          <br />
          {t.home.creditsNote}
        </div>
        <Link href="/about" className="ml-auto inline-flex min-h-12 items-center px-2 text-base font-bold text-clay-700 underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-clay">
          {t.about.link}
        </Link>
      </div>
    </footer>
  )
}
