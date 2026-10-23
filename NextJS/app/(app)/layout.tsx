import type { Viewport } from 'next'
import { getI18n } from '@/i18n/server'
import { I18nProvider } from '@/i18n/provider'
import BottomNav from '@/components/app/bottom-nav'
import SwRegister from '@/components/app/sw-register'
import InstallPopup from '@/components/app/install-popup'

export const viewport: Viewport = { themeColor: '#151719' }

// Mobile-first frame of the product screens: the 3-tab bar at the bottom on phones, the same links in the top bar
// from 768 px. Pages size their own columns (`col-narrow`, `col-wide`) and draw their own top bar (dark on Home).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getI18n()

  return (
    <I18nProvider lang={lang} t={t}>
      <div className="flex min-h-screen flex-col bg-sand text-night-900">
        <main className="flex w-full flex-1 flex-col pb-28 md:pb-12">{children}</main>
        <BottomNav />
        <SwRegister />
        <InstallPopup />
      </div>
    </I18nProvider>
  )
}
