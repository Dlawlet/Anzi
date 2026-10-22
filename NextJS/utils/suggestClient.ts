import { parseQuery } from './addressQuery.js'
import { searchPlaces, within, type GeoFeature } from './geocode'

// An Anzi street name (to complete with a number), or a finished answer: an old address or a place from the map.
export type Suggestion = { name: string; lang: 'fr' | 'en'; quarter: string; city: string; map?: GeoFeature }

const MIN_LETTERS = 2
const MAP_MIN = 3 // letters before the map is asked (its free quota is shared by every visitor)
const PER_SOURCE = 4
const SERVER_TIMEOUT_MS = 5000 // a database waking up must not hold the other sources back
const MAX_TOTAL = 8

// Worth asking the server: at least two letters, and not a backup code.
export function shouldSuggest(text: string): boolean {
  const q = text.trim()
  if (q.replace(/[^\p{L}]/gu, '').length < MIN_LETTERS) return false
  return parseQuery(q).type !== 'code'
}

// "Manguier " for a typed "mang"; a number already typed is kept: "12 man" -> "Manguier 12".
export function completeWith(typed: string, name: string): string {
  const number = /(?:^|\s)(\d{1,4}[a-z]?)(?=\s|$)/i.exec(typed)?.[1]
  return number ? `${name} ${number}` : `${name} `
}

// Each source answers on its own: one that fails or is empty never hides the others.
async function anziStreets(text: string, signal: AbortSignal): Promise<Suggestion[]> {
  try {
    const res = await fetch(`/api/find/suggest?q=${encodeURIComponent(text)}`, { signal: within(SERVER_TIMEOUT_MS, signal) })
    if (!res.ok) return []
    return (((await res.json()) as { suggestions?: Suggestion[] }).suggestions ?? []).slice(0, PER_SOURCE)
  } catch {
    return []
  }
}

// Addresses saved before the refactor (label + position only).
async function oldAddresses(text: string, signal: AbortSignal): Promise<Suggestion[]> {
  try {
    const res = await fetch(`/api/lookup?q=${encodeURIComponent(text)}`, { signal: within(SERVER_TIMEOUT_MS, signal) })
    if (!res.ok) return []
    const matches = ((await res.json()) as { matches?: { id: string; title: string; city: string; lat: number; lng: number }[] }).matches ?? []
    return matches.slice(0, PER_SOURCE).map((m) => ({ name: m.title, lang: 'fr' as const, quarter: '', city: m.city, map: { id: `old:${m.id}`, title: m.title, city: m.city, lat: m.lat, lng: m.lng } }))
  } catch {
    return []
  }
}

async function mapPlaces(text: string, signal: AbortSignal): Promise<Suggestion[]> {
  if (text.length < MAP_MIN) return []
  const found = await searchPlaces(text, { autocomplete: true, limit: PER_SOURCE, signal })
  return found.map((f) => ({ name: f.title, lang: 'fr' as const, quarter: '', city: f.city, map: f }))
}

const cache = new Map<string, Suggestion[]>() // same text typed again: answered at once

function merge(parts: Suggestion[][]): Suggestion[] {
  const seen = new Set<string>()
  return parts
    .flat()
    .filter((item) => {
      const key = `${item.name.toLowerCase()}|${item.city.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_TOTAL)
}

// Anzi streets first, then old addresses, then OpenStreetMap places, without repeats. Each source shows up as soon as
// it answers (`onUpdate`), so the fast ones are never kept waiting by the slow ones.
export async function fetchSuggestions(raw: string, signal: AbortSignal, onUpdate?: (items: Suggestion[]) => void): Promise<Suggestion[]> {
  const text = raw.trim()
  const key = text.toLowerCase()
  const hit = cache.get(key)
  if (hit) {
    onUpdate?.(hit)
    return hit
  }
  const parts: Suggestion[][] = [[], [], []]
  const sources = [anziStreets, oldAddresses, mapPlaces]
  await Promise.all(
    sources.map(async (source, i) => {
      parts[i] = await source(text, signal)
      if (!signal.aborted) onUpdate?.(merge(parts))
    })
  )
  const all = merge(parts)
  if (!signal.aborted && all.length > 0) {
    if (cache.size > 50) cache.clear()
    cache.set(key, all)
  }
  return all
}
