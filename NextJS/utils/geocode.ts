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
