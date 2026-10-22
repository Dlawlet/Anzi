// Mapbox geocoding (OpenStreetMap-based): the fallback when Anzi itself knows nothing about what was typed.
// It was the search of the old version. Called from the phone with the public (URL-restricted) token; the typed
// text only leaves the phone when Anzi found nothing, or while suggesting names no Anzi street starts with.
export type GeoFeature = { id: string; title: string; city: string; lat: number; lng: number }

type MapboxFeature = { id?: string; text?: string; place_name?: string; center?: [number, number] }

const COUNTRY = 'cm'


export async function geocodeText(text: string, opts: { autocomplete?: boolean; limit?: number; signal?: AbortSignal } = {}): Promise<GeoFeature[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const q = text.trim().slice(0, 80)
  if (!token || q.length < 2) return []
  const params = new URLSearchParams({
    access_token: token,
    country: COUNTRY,
    language: 'fr',
    limit: String(opts.limit ?? 5),
    autocomplete: String(Boolean(opts.autocomplete)),
  })
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}`, { signal: opts.signal })
    if (!res.ok) return []
    const body = (await res.json()) as { features?: MapboxFeature[] }
    const out: GeoFeature[] = []
    for (const f of body.features ?? []) {
      const [lng, lat] = f.center ?? []
      if (!f.id || !f.text || typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) continue
      // "Rue X, Yaoundé, Centre, Cameroun": the first part is the title, the town and region follow.
      const rest = (f.place_name ?? '').split(',').slice(1).map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== 'cameroun' && s.toLowerCase() !== 'cameroon')
      out.push({ id: f.id, title: f.text, city: rest.slice(0, 2).join(', '), lat, lng })
    }
    return out
  } catch {
    return []
  }
}

// Photon (komoot.io) searches OpenStreetMap itself and completes while you type: schools, shops, churches and
// streets with the names mapped by the community, which Mapbox's own data often lacks in Cameroon.
const PHOTON_URL = 'https://photon.komoot.io/api/'
const CAMEROON_BBOX = '8.4,1.6,16.3,13.1' // minLon,minLat,maxLon,maxLat
const BIAS = { lat: 3.8667, lon: 11.5174 } // Yaoundé: nearer places first when names tie
const TIMEOUT_MS = 4000

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: { name?: string; street?: string; housenumber?: string; district?: string; locality?: string; city?: string; county?: string; state?: string; osm_id?: number; osm_type?: string }
}

// An abort signal that also fires after `ms` (a slow service must not hold the list back).
export function within(ms: number, parent?: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const stop = () => {
    clearTimeout(timer)
    controller.abort()
  }
  if (parent?.aborted) stop()
  else parent?.addEventListener('abort', stop, { once: true })
  return controller.signal
}

export async function photonSearch(text: string, opts: { limit?: number; signal?: AbortSignal } = {}): Promise<GeoFeature[]> {
  const q = text.trim().slice(0, 80)
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, limit: String(opts.limit ?? 5), lang: 'fr', bbox: CAMEROON_BBOX, lat: String(BIAS.lat), lon: String(BIAS.lon) })
  try {
    const res = await fetch(`${PHOTON_URL}?${params}`, { signal: within(TIMEOUT_MS, opts.signal) })
    if (!res.ok) return []
    const body = (await res.json()) as { features?: PhotonFeature[] }
    const out: GeoFeature[] = []
    for (const f of body.features ?? []) {
      const p = f.properties ?? {}
      const [lng, lat] = f.geometry?.coordinates ?? []
      const title = p.name || [p.housenumber, p.street].filter(Boolean).join(' ')
      if (!title || typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) continue
      const where = [p.district || p.locality, p.city || p.county, p.state].filter((v, i, all) => v && all.indexOf(v) === i)
      out.push({ id: `osm:${p.osm_type ?? ''}${p.osm_id ?? `${lng},${lat}`}`, title, city: where.slice(0, 2).join(', '), lat, lng })
    }
    return out
  } catch {
    return []
  }
}

// OpenStreetMap first (named places), Mapbox only when OSM has nothing (keeps its free quota).
export async function searchPlaces(text: string, opts: { autocomplete?: boolean; limit?: number; signal?: AbortSignal } = {}): Promise<GeoFeature[]> {
  const osm = await photonSearch(text, { limit: opts.limit, signal: opts.signal })
  if (osm.length > 0) return osm
  return geocodeText(text, { ...opts, signal: opts.signal ? within(TIMEOUT_MS, opts.signal) : within(TIMEOUT_MS) })
}
