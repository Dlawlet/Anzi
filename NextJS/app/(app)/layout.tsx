import Link from 'next/link'
import { getI18n } from '@/i18n/server'
import { I18nProvider } from '@/i18n/provider'
import BottomNav from '@/components/app/bottom-nav'
import LangToggle from '@/components/app/lang-toggle'
import { PinHouseIcon } from '@/components/app/icons'

// Light, mobile-first frame of the new product screens (plan section 4).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getI18n()

  return (
    <I18nProvider lang={lang} t={t}>
      <div className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
            <Link href="/" className="flex min-h-11 items-center gap-2 text-xl font-bold text-green-800">
              <PinHouseIcon className="h-7 w-7 text-green-700" />
              {t.brand}
            </Link>
            <LangToggle />
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 pb-28 pt-6">{children}</main>
        <BottomNav />
      </div>
    </I18nProvider>
  )
}
