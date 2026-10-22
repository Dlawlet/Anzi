import { parseQuery } from './addressQuery.js'

export type Suggestion = { name: string; lang: 'fr' | 'en'; quarter: string; city: string }

const MIN_LETTERS = 2

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
    return ((await res.json()) as { suggestions?: Suggestion[] }).suggestions ?? []
  } catch {
    return []
  }
}
