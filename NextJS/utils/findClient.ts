import { parseQuery } from './addressQuery.js'
import { nameKey } from './streetNames.js'
import { addressLine, type AddressTemplates } from './share'
import { geocodeText, type GeoFeature } from './geocode'
import type { PlaceView } from '../types/place'

// What the search box (Find page and the full-screen map) shows for one answer: a street + number, or a place.
export type Hit = {
  key: string
  street: { name: string; lang: 'fr' | 'en'; provisional: boolean } | null
  number: number | null
  suffix: string
  formerName: string | null
  quarter: string
  city: string
  lat: number
  lng: number
  precisionM: number | null
  place: PlaceView | null // the full card: public places, codes, and this phone's own addresses
  legacyTitle?: string // an address of the old collection: a label and a position only
}

export type SearchOutcome =
  | { status: 'ok'; hits: Hit[]; ambiguous: boolean }
  | { status: 'none'; type: 'code' | 'address' | 'words' }
  | { status: 'error'; reason: 'tooMany' | 'network' | 'generic' }

type ApiStreet = { id: string; name: string; lang: 'fr' | 'en'; nameStatus: string; quarter: string; city: string }
type ApiResult =
  | { kind: 'place'; place: PlaceView }
  | { kind: 'address'; street: ApiStreet; number: number; suffix: string; formerName: string | null; spot: { lng: number; lat: number; precisionM: number }; place: PlaceView | null }
type LegacyMatch = { id: string; title: string; city: string; lat: number; lng: number }

export function hitFromPlace(place: PlaceView): Hit {
  return {
    key: place.code,
    street: place.street ? { name: place.street.name, lang: place.street.lang, provisional: place.street.nameStatus !== 'accepted' } : null,
    number: place.houseNumber,
    suffix: place.houseSuffix,
    formerName: null,
    quarter: place.quarter,
    city: place.city,
    lat: place.lat,
    lng: place.lng,
    precisionM: place.accuracyM,
    place,
  }
}

function hitFromResult(result: ApiResult): Hit {
  if (result.kind === 'place') return hitFromPlace(result.place)
  const { street, place } = result
  return {
    key: `${street.id}:${result.number}${result.suffix}`,
    street: { name: street.name, lang: street.lang, provisional: street.nameStatus !== 'accepted' },
    number: result.number,
    suffix: result.suffix,
    formerName: result.formerName,
    quarter: street.quarter,
    city: street.city,
    lat: place ? place.lat : result.spot.lat,
    lng: place ? place.lng : result.spot.lng,
    precisionM: place ? place.accuracyM : result.spot.precisionM,
    place,
  }
}

const hitFromLegacy = (match: LegacyMatch): Hit => ({
  key: `old:${match.id}`,
  street: null,
  number: null,
  suffix: '',
  formerName: null,
  quarter: '',
  city: match.city,
  lat: match.lat,
  lng: match.lng,
  precisionM: null,
  place: null,
  legacyTitle: match.title,
})

// A place found on the map (OpenStreetMap): a label and a position only, like an old address.
export const hitFromGeocode = (f: GeoFeature): Hit => ({
  key: `map:${f.id}`,
  street: null,
  number: null,
  suffix: '',
  formerName: null,
  quarter: '',
  city: f.city,
  lat: f.lat,
  lng: f.lng,
  precisionM: null,
  place: null,
  legacyTitle: f.title,
})

// Addresses saved on this phone that answer the query: works with no connection.
export function searchLocal(raw: string, places: PlaceView[]): Hit[] {
  const query = parseQuery(raw)
  if (query.type === 'code') return places.filter((p) => p.code === query.code).map(hitFromPlace)
  if (query.type !== 'address' || !query.words) return []
  const key = nameKey(query.words.join(' '))
  return places
    .filter((p) => p.houseNumber === query.number && p.houseSuffix === query.suffix && p.street?.name && nameKey(p.street.name) === key)
    .map(hitFromPlace)
}

// /api/find first (code, street + number, public names); when it finds nothing, the old collection by words.
export async function searchAddress(raw: string): Promise<SearchOutcome> {
  const text = raw.trim()
  const q = encodeURIComponent(text)
  try {
    const res = await fetch(`/api/find?q=${q}`)
    if (res.status === 429) return { status: 'error', reason: 'tooMany' }
    if (res.ok) {
      const body = (await res.json()) as { results?: ApiResult[]; ambiguous?: boolean }
      const hits = (body.results ?? []).map(hitFromResult)
      if (hits.length > 0) return { status: 'ok', hits, ambiguous: Boolean(body.ambiguous) }
    } else if (res.status !== 404 && res.status !== 400) {
      return { status: 'error', reason: 'generic' }
    }
    const type = parseQuery(text).type
    const kind = type === 'code' || type === 'address' ? type : 'words'
    if (kind === 'code') return { status: 'none', type: kind }
    const old = await fetch(`/api/lookup?q=${q}`)
    if (old.status === 429) return { status: 'error', reason: 'tooMany' }
    if (old.ok) {
      const matches = (((await old.json()) as { matches?: LegacyMatch[] }).matches ?? []).map(hitFromLegacy)
      if (matches.length > 0) return { status: 'ok', hits: matches, ambiguous: matches.length > 1 }
    }
    // Neither Anzi nor the old collection knows it: ask the map (OpenStreetMap), like the old search did.
    const onMap = (await geocodeText(text)).map(hitFromGeocode)
    if (onMap.length > 0) return { status: 'ok', hits: onMap, ambiguous: onMap.length > 1 }
    return { status: 'none', type: kind }
  } catch {
    return { status: 'error', reason: 'network' }
  }
}

const addressable = (hit: Hit, withWhere: boolean) => ({
  street: hit.street ? { name: hit.street.name } : null,
  houseNumber: hit.number,
  houseSuffix: hit.suffix,
  officialNumber: hit.place?.officialNumber ?? '',
  quarter: withWhere ? hit.quarter : '',
  city: withWhere ? hit.city : '',
})

// "12 Rue Manguier" (or the place name, or the old label when there is nothing else).
export const hitTitle = (hit: Hit, tpl: AddressTemplates): string =>
  hit.legacyTitle || addressLine(addressable(hit, false), tpl) || hit.place?.name || ''

// "12 Rue Manguier, Bastos, Yaoundé"
export const hitLine = (hit: Hit, tpl: AddressTemplates): string =>
  hit.legacyTitle ? [hit.legacyTitle, hit.city].filter(Boolean).join(', ') : addressLine(addressable(hit, true), tpl) || hit.place?.name || ''
