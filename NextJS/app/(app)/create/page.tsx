import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import CreateFlow from '@/components/app/create-flow'
import AppBar from '@/components/app/app-bar'
import { inCameroon } from '@/utils/gps'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.meta.createTitle} - ${t.brand}`, description: t.meta.description }
}

// `?lat=&lng=` : a house picked on the map. Anything that is not a position in Cameroon is ignored.
function targetOf(lat?: string | string[], lng?: string | string[]) {
  const la = typeof lat === 'string' ? Number(lat) : NaN
  const ln = typeof lng === 'string' ? Number(lng) : NaN
  return inCameroon(la, ln) ? { lat: la, lng: ln } : null
}

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ lat?: string | string[]; lng?: string | string[] }> }) {
  const { lat, lng } = await searchParams
  return (
    <>
      <AppBar />
      <div className="col-narrow px-4 pt-6"><CreateFlow target={targetOf(lat, lng)} /></div>
    </>
  )
}
