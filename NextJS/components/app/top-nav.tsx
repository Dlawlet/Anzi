'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/provider'

// Desktop version of the 3 tabs (the bottom bar is phone-only): the same three places, in the top bar from 768 px.
export default function TopNav({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const on = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  const isFind = pathname === '/' || on('/find')

  const link = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-4 text-base font-bold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ${
      dark
        ? `focus-visible:outline-sun ${active ? 'bg-night-700 text-white' : 'text-night-300 hover:text-white'}`
        : `focus-visible:outline-clay ${active ? 'bg-sun-200 text-clay-700' : 'text-muted hover:text-night-900'}`
    }`

  return (
    <nav aria-label={t.nav.label} className="ml-auto mr-2 hidden items-center gap-1 md:flex">
      <Link href="/" aria-current={isFind ? 'page' : undefined} className={link(isFind)}>{t.nav.find}</Link>
      <Link href="/mine" aria-current={on('/mine') ? 'page' : undefined} className={link(on('/mine'))}>{t.nav.mine}</Link>
      <Link href="/create" aria-current={on('/create') ? 'page' : undefined} className="ml-1 inline-flex min-h-11 items-center rounded-full bg-sun px-5 text-base font-bold text-night-900 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-clay">
        {t.nav.create}
      </Link>
    </nav>
  )
}
