// "Recently opened": the last addresses this phone looked at, kept in local storage only. No server, no account,
// nothing is sent anywhere. Storage can be missing or blocked: every access is guarded.
const KEY = 'anzi.recent.v1'
export const MAX_RECENT = 6

export type Recent = { q: string; label: string; sub: string; lat: number; lng: number }

const isRecent = (value: unknown): value is Recent =>
  typeof value === 'object' && value !== null &&
  typeof (value as Recent).q === 'string' && typeof (value as Recent).label === 'string' && typeof (value as Recent).sub === 'string' &&
  typeof (value as Recent).lat === 'number' && typeof (value as Recent).lng === 'number'

// Newest first, no duplicates (same label and place), capped.
export function pushRecent(list: Recent[], item: Recent): Recent[] {
  const same = (r: Recent) => r.label === item.label && Math.abs(r.lat - item.lat) < 1e-4 && Math.abs(r.lng - item.lng) < 1e-4
  return [item, ...list.filter((r) => !same(r))].slice(0, MAX_RECENT)
}

export function readRecent(): Recent[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRecent).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

export function addRecent(item: Recent) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pushRecent(readRecent(), item)))
  } catch {
    // storage full or blocked: nothing to do
  }
}

export function clearRecent() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // blocked: nothing to do
  }
}
