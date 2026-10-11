import type { PlaceView } from '../types/place'

// A copy of this device's addresses so "My addresses" and the address card still open with no connection.
// Browser storage can be missing or blocked: every access is guarded and the app works without it.
const KEY = 'anzi.places.v1'
const MAX = 50

const isPlace = (value: unknown): value is PlaceView =>
  typeof value === 'object' && value !== null &&
  typeof (value as PlaceView).code === 'string' && typeof (value as PlaceView).name === 'string' &&
  typeof (value as PlaceView).lat === 'number' && typeof (value as PlaceView).lng === 'number'

export function readLocalPlaces(): PlaceView[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isPlace) : []
  } catch {
    return []
  }
}

function write(places: PlaceView[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(places.slice(0, MAX)))
  } catch {
    // storage full or blocked: nothing to do
  }
}

export function saveLocalPlace(place: PlaceView) {
  write([place, ...readLocalPlaces().filter((p) => p.code !== place.code)])
}

export function replaceLocalPlaces(places: PlaceView[]) {
  write(places)
}

export function removeLocalPlace(code: string) {
  write(readLocalPlaces().filter((p) => p.code !== code))
}
