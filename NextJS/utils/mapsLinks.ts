// Hand-off links for the "Y aller" sheet (docs/design-2026-10.md section 4.4). Plain links, no API key.
// Coordinates always use 6 decimals, latitude first.
export type LatLng = { lat: number; lng: number }

const pair = ({ lat, lng }: LatLng, sep: string) => `${lat.toFixed(6)}${sep}${lng.toFixed(6)}`

// Android shows a labelled point with geo:0,0?q=lat,lng(label) in the user's default maps app (offline maps
// included). The label sits inside parentheses, so a user-supplied ( or ) must be escaped too.
export const geoUrl = (at: LatLng, label: string) =>
  `geo:0,0?q=${pair(at, ',')}(${encodeURIComponent(label).replace(/\(/g, '%28').replace(/\)/g, '%29')})`

export const googleDirUrl = (at: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${pair(at, ',')}&travelmode=driving`

export const wazeUrl = (at: LatLng) => `https://waze.com/ul?ll=${pair(at, ',')}&navigate=yes`

export const appleUrl = (at: LatLng) => `https://maps.apple.com/?daddr=${pair(at, ',')}`

// Pasted in WhatsApp or in a maps search box.
export const coordsText = (at: LatLng) => pair(at, ', ')

export type GoRow = 'phone' | 'google' | 'waze' | 'apple' | 'copy'
export type Platform = 'android' | 'ios' | 'desktop'

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return 'android'
  // iPadOS 13+ reports itself as a Mac with a touch screen.
  if (/iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios'
  return 'desktop'
}

// Android: phone app, Google Maps, Waze, Apple Maps, copy. iPhone: Apple Maps first, no `geo:` row.
// Desktop: no `geo:` row. The last row the person used moves to the top when it is available here.
export function platformOrder(platform: Platform, last?: string | null): GoRow[] {
  const base: GoRow[] =
    platform === 'android'
      ? ['phone', 'google', 'waze', 'apple', 'copy']
      : platform === 'ios'
        ? ['apple', 'google', 'waze', 'copy']
        : ['google', 'waze', 'apple', 'copy']
  const first = base.find((row) => row === last)
  return first ? [first, ...base.filter((row) => row !== first)] : base
}
