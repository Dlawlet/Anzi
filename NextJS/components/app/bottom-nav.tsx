'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/provider'
import { ListIcon, PlusIcon, SearchIcon } from './icons'

export default function BottomNav() {
  const { t } = useI18n()
  const pathname = usePathname()
  const items = [
    { href: '/find', label: t.nav.find, Icon: SearchIcon },
    { href: '/create', label: t.nav.create, Icon: PlusIcon },
    { href: '/mine', label: t.nav.mine, Icon: ListIcon },
  ]

  return (
    <nav aria-label={t.nav.label} className="fixed bottom-0 inset-x-0 z-20 border-t border-gray-300 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-700 ${active ? 'text-green-800' : 'text-gray-600'}`}
              >
                <Icon className={`h-6 w-6 ${active ? 'text-green-700' : ''}`} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
