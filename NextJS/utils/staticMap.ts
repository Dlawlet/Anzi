// Web-Mercator maths for the static map preview (docs/design-2026-10.md section 5.2): the server asks
// Mapbox for one plain image per area, then street lines and number tags are drawn on top of it with
// SVG and HTML. No map library, no JS shipped for this.

export type LngLat = [number, number]
export type MapView = { center: LngLat; zoom: number; width: number; height: number }

const TILE = 512 // Mapbox GL and Static Images use 512 px tiles
const MIN_ZOOM = 12
const MAX_ZOOM = 17

const worldSize = (zoom: number) => TILE * 2 ** zoom
const mercatorX = (lng: number, zoom: number) => ((lng + 180) / 360) * worldSize(zoom)
const mercatorY = (lat: number, zoom: number) => {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat))
  const sin = Math.sin((clamped * Math.PI) / 180)
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize(zoom)
}

// Pixel position of a point inside the image (0,0 = top-left).
export function toPixel(view: MapView, [lng, lat]: LngLat): { x: number; y: number } {
  return {
    x: mercatorX(lng, view.zoom) - mercatorX(view.center[0], view.zoom) + view.width / 2,
    y: mercatorY(lat, view.zoom) - mercatorY(view.center[1], view.zoom) + view.height / 2,
  }
}

// Same position as percentages of the image, for absolutely positioned HTML tags.
export function toPercent(view: MapView, point: LngLat): { left: number; top: number } {
  const { x, y } = toPixel(view, point)
  return { left: round((x / view.width) * 100, 2), top: round((y / view.height) * 100, 2) }
}

const round = (value: number, digits: number) => {
  const k = 10 ** digits
  return Math.round(value * k) / k
}

// "M12.3 40.1L50 60" in image pixels, for an SVG with viewBox "0 0 width height".
export function linePath(view: MapView, coordinates: LngLat[]): string {
  return coordinates
    .map((point, i) => {
      const { x, y } = toPixel(view, point)
      return `${i === 0 ? 'M' : 'L'}${round(x, 1)} ${round(y, 1)}`
    })
    .join('')
}

// Name chip: the middle of the line, tilted like the street, but flat when the street is steep (easier to read).
export function chipPlacement(view: MapView, coordinates: LngLat[]): { left: number; top: number; angle: number } {
  const first = toPixel(view, coordinates[0])
  const last = toPixel(view, coordinates[coordinates.length - 1])
  const mid = toPercent(view, [(coordinates[0][0] + coordinates[coordinates.length - 1][0]) / 2, (coordinates[0][1] + coordinates[coordinates.length - 1][1]) / 2])
  let angle = (Math.atan2(last.y - first.y, last.x - first.x) * 180) / Math.PI
  if (angle > 90) angle -= 180
  if (angle <= -90) angle += 180
  return { ...mid, angle: Math.abs(angle) > 30 ? 0 : round(angle, 0) }
}

// Rough label boxes in image pixels, to hide labels that would sit on top of each other.
// Priority (docs/design-2026-10.md section 5.2): street chips first, then number tags.
export type Box = { x: number; y: number; w: number; h: number }

export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

export function boxAt(view: MapView, point: LngLat, w: number, h: number): Box {
  const { x, y } = toPixel(view, point)
  return { x: x - w / 2, y: y - h / 2, w, h }
}

// Keeps the items, in order, that do not collide with the reserved boxes or with an item kept before them.
export function keepFree<T>(items: T[], boxOf: (item: T) => Box, reserved: Box[] = []): { kept: T[]; boxes: Box[] } {
  const boxes = [...reserved]
  const kept: T[] = []
  for (const item of items) {
    const box = boxOf(item)
    if (boxes.some((other) => overlaps(box, other))) continue
    boxes.push(box)
    kept.push(item)
  }
  return { kept, boxes }
}

// Smallest view that shows all points with a margin, snapped to a whole zoom and a rounded centre so the
// image URL is the same for everyone looking at the same area (it can then be cached).
export function fitView(points: LngLat[], fallback: MapView, margin = 0.18): MapView {
  if (points.length === 0) return fallback
  const lngs = points.map((p) => p[0])
  const lats = points.map((p) => p[1])
  const center: LngLat = [
    round((Math.min(...lngs) + Math.max(...lngs)) / 2, 4),
    round((Math.min(...lats) + Math.max(...lats)) / 2, 4),
  ]
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom--) {
    const view = { ...fallback, center, zoom }
    const fits = points.every((p) => {
      const { x, y } = toPixel(view, p)
      return x >= fallback.width * margin && x <= fallback.width * (1 - margin) && y >= fallback.height * margin && y <= fallback.height * (1 - margin)
    })
    if (fits) return view
  }
  return { ...fallback, center, zoom: MIN_ZOOM }
}

// Mapbox Static Images URL (plain image, no overlays in the URL). The token is the public one, to be
// restricted by URL in the Mapbox account.
export function staticMapUrl(view: MapView, token: string, { style = 'mapbox/streets-v12', retina = false } = {}): string {
  const [lng, lat] = view.center
  return `https://api.mapbox.com/styles/v1/${style}/static/${lng},${lat},${view.zoom},0/${view.width}x${view.height}${retina ? '@2x' : ''}?access_token=${encodeURIComponent(token)}`
}
