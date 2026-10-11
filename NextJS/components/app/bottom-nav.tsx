'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/provider'
import { BookmarkIcon, PlusIcon, SearchIcon } from './icons'

// Three tabs: Find (Home with the map), Create (raised orange button), My addresses.
export default function BottomNav() {
  const { t } = useI18n()
  const pathname = usePathname()
  const isFind = pathname === '/' || pathname === '/find' || pathname.startsWith('/find/')
  const isCreate = pathname === '/create' || pathname.startsWith('/create/')
  const isMine = pathname === '/mine' || pathname.startsWith('/mine/')

  const tab = (active: boolean) =>
    `flex min-h-[62px] flex-1 flex-col items-center justify-end gap-[3px] text-sm font-semibold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-clay ${active ? 'text-clay-700' : 'text-muted'}`
  const pill = (active: boolean) => `grid h-[34px] w-[62px] place-items-center rounded-full ${active ? 'bg-sun-200' : ''}`

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-20 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_#E7DED3,0_-10px_24px_-14px_rgba(66,33,11,0.25)]"
    >
      <div className="mx-auto flex h-[78px] max-w-md items-end px-1.5 pb-2">
        <Link href="/" aria-current={isFind ? 'page' : undefined} className={tab(isFind)}>
          <span className={pill(isFind)}><SearchIcon className="h-6 w-6" /></span>
          {t.nav.find}
        </Link>
        <Link href="/create" aria-current={isCreate ? 'page' : undefined} className={`${tab(false)} !text-night-900`}>
          <span className="-mt-[34px] grid h-[62px] w-[62px] place-items-center rounded-full bg-sun text-night-900 shadow-[inset_0_-3px_0_#A95700,0_0_0_5px_#fff,0_12px_22px_-8px_rgba(169,87,0,0.7)]">
            <PlusIcon className="h-[30px] w-[30px]" />
          </span>
          {t.nav.create}
        </Link>
        <Link href="/mine" aria-current={isMine ? 'page' : undefined} className={tab(isMine)}>
          <span className={pill(isMine)}><BookmarkIcon className="h-6 w-6" /></span>
          {t.nav.mine}
        </Link>
      </div>
    </nav>
  )
}
