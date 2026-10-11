import { getI18n } from '@/i18n/server'
import { fmt } from '@/i18n/lang'
import { getHomeMap } from '@/utils/homeMap'
import { fitView, staticMapUrl, type MapView } from '@/utils/staticMap'
import MapCard from './map-card'
import MapPreview from './map-preview'

const CITY = 'Yaoundé'
// Image size in CSS pixels at 1x: light on slow data (docs/design-2026-10.md section 5.3).
const CITY_VIEW: MapView = { center: [11.5174, 3.8667], zoom: 14, width: 360, height: 210 }

// The map card of Home: the static preview first (server rendered), the live map only on tap.
// It reads the database through getHomeMap(), which returns null instead of failing.
export default async function HomeMap() {
  const [{ t }, data] = await Promise.all([getI18n(), getHomeMap()])
  const streets = data?.streets ?? []
  const tags = data?.tags ?? []
  // Frame the busiest streets (the list is sorted by number of addresses).
  const view = fitView(streets.slice(0, 3).flatMap((s) => s.line), CITY_VIEW)
  // Public token, restricted by URL in the Mapbox account. Without it the street-lines motif is shown.
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const imageUrl = token ? staticMapUrl(view, token) : null
  const chip = data && (data.streetCount > 0 || data.placeCount > 0)
    ? fmt(t.home.mapChip, { city: CITY, s: data.streetCount, n: data.placeCount })
    : fmt(t.home.mapChipEmpty, { city: CITY })
  const label = fmt(t.home.mapLabel, { city: CITY })

  return (
    <MapCard view={view} streets={streets} tags={tags} label={label}>
      <MapPreview view={view} imageUrl={imageUrl} streets={streets} tags={tags} chip={chip} label={label} />
    </MapCard>
  )
}
