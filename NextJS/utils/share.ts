import { fmt } from '../i18n/lang'
import type { PlaceView } from '../types/place'

type Located = Pick<PlaceView, 'lat' | 'lng'>
type Shareable = Pick<PlaceView, 'code' | 'name' | 'houseNumber' | 'quarter' | 'city' | 'landmark' | 'lat' | 'lng'>

const coords = ({ lat, lng }: Located) => `${lat.toFixed(6)},${lng.toFixed(6)}`

// Plain links that need no API key (plan section 1).
export const mapsViewUrl = (place: Located) =>
  `https://www.google.com/maps/search/?api=1&query=${coords(place)}`

export const mapsNavigateUrl = (place: Located) =>
  `https://www.google.com/maps/dir/?api=1&destination=${coords(place)}&travelmode=driving`

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

// "N° 12, Bastos, Yaoundé": empty parts are skipped.
export function addressLine(place: Pick<PlaceView, 'houseNumber' | 'quarter' | 'city'>, houseNoTemplate: string): string {
  return [place.houseNumber ? fmt(houseNoTemplate, { n: place.houseNumber }) : '', place.quarter, place.city]
    .filter(Boolean)
    .join(', ')
}

type ShareLabels = { code: string; landmark: string; houseNo: string }

// Name, code and landmark first, then the Google Maps link. The Anzi link goes last, and only when a
// real domain is configured (see utils/site.ts).
export function buildShareText(place: Shareable, labels: ShareLabels, siteUrl: string | null): string {
  const lines = [
    place.name,
    `${labels.code}: ${place.code}`,
    addressLine(place, labels.houseNo),
    place.landmark ? `${labels.landmark}: ${place.landmark}` : '',
    mapsViewUrl(place),
    siteUrl ?? '',
  ]
  return lines.filter(Boolean).join('\n')
}
