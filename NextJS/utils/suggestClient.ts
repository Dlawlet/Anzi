import { parseQuery } from './addressQuery.js'
import { geocodeText, type GeoFeature } from './geocode'

// An Anzi street name, or (when no Anzi street starts like that) a place from the map.
export type Suggestion = { name: string; lang: 'fr' | 'en'; quarter: string; city: string; map?: GeoFeature }

const MIN_LETTERS = 2
const MAP_MIN = 3 // letters before the map is asked (its free quota is shared by every visitor)

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

export async function fetchSuggestions(text: string, signal: AbortSignal): Promise<Suggestion[]> {
  try {
    const res = await fetch(`/api/find/suggest?q=${encodeURIComponent(text.trim())}`, { signal })
    if (!res.ok) return []
    const streets = ((await res.json()) as { suggestions?: Suggestion[] }).suggestions ?? []
    if (streets.length > 0 || text.trim().length < MAP_MIN) return streets
    const found = await geocodeText(text, { autocomplete: true, limit: 4, signal })
    return found.map((f) => ({ name: f.title, lang: 'fr' as const, quarter: '', city: f.city, map: f }))
  } catch {
    return []
  }
}
