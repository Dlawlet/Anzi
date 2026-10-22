import { fmt } from '../i18n/lang'
import { googleDirUrl } from './mapsLinks'
import type { PlaceView } from '../types/place'

type Located = Pick<PlaceView, 'lat' | 'lng'>
type Addressable = { street: { name: string; postalCode?: string } | null } & Pick<PlaceView, 'houseNumber' | 'houseSuffix' | 'officialNumber' | 'quarter' | 'city'>
type Shareable = Addressable & Pick<PlaceView, 'code' | 'name' | 'landmark' | 'lat' | 'lng'>

const coords = ({ lat, lng }: Located) => `${lat.toFixed(6)},${lng.toFixed(6)}`

// Plain links that need no API key (plan section 1).
export const mapsViewUrl = (place: Located) =>
  `https://www.google.com/maps/search/?api=1&query=${coords(place)}`

export const mapsNavigateUrl = (place: Located) => googleDirUrl(place)

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

// Templates for the street address; the type word (Rue / Street) follows the reader's language.
export type AddressTemplates = { street: string; unnamed: string; houseNo: string }

// "1060 Yaoundé": the town with its postal code when the street has one. Without a town there is no code.
const townOf = (place: Pick<Addressable, 'street' | 'city'>) =>
  place.city ? [place.street?.postalCode, place.city].filter(Boolean).join(' ') : ''

// "Bastos · 1060 Yaoundé" for the small "where" lines under an address.
export const placeWhere = (place: Pick<Addressable, 'street' | 'quarter' | 'city'>): string =>
  [place.quarter, townOf(place)].filter(Boolean).join(' · ')

// "12 Rue Manguier, Bastos, 1060 Yaoundé" (the postal code is optional). Without a number the street name alone leads;
// an official plate is the fallback. Empty parts are skipped.
export function addressLine(place: Addressable, tpl: AddressTemplates): string {
  const n = place.houseNumber != null ? `${place.houseNumber}${place.houseSuffix}` : ''
  let lead = ''
  if (n && place.street?.name) lead = fmt(tpl.street, { n, name: place.street.name })
  else if (n && place.street) lead = fmt(tpl.unnamed, { n })
  else if (place.officialNumber) lead = fmt(tpl.houseNo, { n: place.officialNumber })
  return [lead, place.quarter, townOf(place)].filter(Boolean).join(', ')
}

// "12 Rue Manguier" alone (no quarter or city), or the place name when there is no number yet.
export const addressTitle = (place: Addressable & { name: string }, tpl: AddressTemplates): string =>
  addressLine({ ...place, quarter: '', city: '' }, tpl) || place.name

type ShareLabels = AddressTemplates & { code: string; landmark: string }

// Name, street address and landmark first, then the Google Maps link, then the backup code (the code is how a
// link-only place is opened in Anzi, but it is never the first thing the reader sees). The Anzi link goes last, and
// only when a real domain is configured (see utils/site.ts).
export function buildShareText(place: Shareable, labels: ShareLabels, siteUrl: string | null): string {
  const lines = [
    place.name,
    addressLine(place, labels),
    place.landmark ? `${labels.landmark}: ${place.landmark}` : '',
    mapsViewUrl(place),
    `${labels.code}: ${place.code}`,
    siteUrl ?? '',
  ]
  return lines.filter(Boolean).join('\n')
}
