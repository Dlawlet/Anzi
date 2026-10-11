import type { Viewport } from 'next'
import { getI18n } from '@/i18n/server'
import { I18nProvider } from '@/i18n/provider'
import BottomNav from '@/components/app/bottom-nav'
import SwRegister from '@/components/app/sw-register'

export const viewport: Viewport = { themeColor: '#151719' }

// Mobile-first frame of the product screens: a phone-width column on sand, the 3-tab bar at the bottom.
// Each page draws its own top bar (dark on Home, light elsewhere).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getI18n()

  return (
    <I18nProvider lang={lang} t={t}>
      <div className="min-h-screen bg-sand text-night-900">
        <main className="mx-auto max-w-md pb-28">{children}</main>
        <BottomNav />
        <SwRegister />
      </div>
    </I18nProvider>
  )
}
