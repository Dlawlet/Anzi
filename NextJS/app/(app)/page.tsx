import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import AppBar from '@/components/app/app-bar'
import HeroBand from '@/components/app/hero-band'
import HomeMap from '@/components/app/home-map'
import MapPreview from '@/components/app/map-preview'
import AddressSearchBox from '@/components/app/address-search-box'
import HomeMine from '@/components/app/home-mine'
import HowItWorks from '@/components/app/how-it-works'
import Credits from '@/components/app/credits'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.brand} - ${t.home.tagline}`, description: t.meta.description }
}

const PLACEHOLDER_VIEW = { center: [11.5174, 3.8667] as [number, number], zoom: 14, width: 360, height: 210 }

// Home = the "Trouver" tab (docs/design-2026-10.md section 4.1). The dark hero and the search paint at once;
// the map card streams in after its data (and shows the street-lines motif while it waits). No map library
// is loaded here: Mapbox GL arrives only after a tap on "Agrandir".
export default async function Home() {
  const { t } = await getI18n()

  return (
    <>
      <AppBar variant="dark" />
      <HeroBand />
      <section aria-label={t.home.searchLabel} className="relative z-[1] -mt-[74px] mx-4 overflow-hidden rounded-3xl bg-white shadow-warm2">
        <Suspense fallback={<MapPreview view={PLACEHOLDER_VIEW} imageUrl={null} streets={[]} tags={[]} chip="Yaoundé" label="Yaoundé" />}>
          <HomeMap />
        </Suspense>
        <AddressSearchBox />
      </section>
      <HomeMine fallback={<HowItWorks />} />
      <Credits />
    </>
  )
}
