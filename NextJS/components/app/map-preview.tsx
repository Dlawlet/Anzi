import { chipPlacement, keepFree, linePath, toPercent, type MapView } from '@/utils/staticMap'
import type { HomeStreet, HomeTag } from '@/utils/homeMap'
import { CategoryIcon } from './icons'

const MAX_CHIPS = 4 // street name chips per view

// Static map: one plain image from Mapbox, the street lines as inline SVG and the number tags as HTML on top.
// 0 kB of map JavaScript (docs/design-2026-10.md section 5.2). Without a token, or offline, the street-lines
// motif behind it stays visible. All text on it is rendered as text.
export default function MapPreview({
  view,
  imageUrl,
  imageUrl2x,
  streets,
  tags,
  chip,
  label,
}: {
  view: MapView
  imageUrl: string | null
  imageUrl2x?: string | null
  streets: HomeStreet[]
  tags: HomeTag[]
  chip: string
  label: string
}) {
  const inside = ({ left, top }: { left: number; top: number }) => left > 4 && left < 96 && top > 6 && top < 94
  const boxAround = ({ left, top }: { left: number; top: number }, w: number, h: number) => ({
    x: (left / 100) * view.width - w / 2,
    y: (top / 100) * view.height - h / 2,
    w,
    h,
  })
  // Labels that would overlap are dropped, in this order: the two overlays in the corners, street chips, number tags.
  const corners = [
    { x: 10, y: 10, w: chip.length * 7.4 + 36, h: 36 },
    { x: view.width - 130, y: view.height - 58, w: 130, h: 58 },
  ]
  const named = streets
    .filter((s) => s.name && s.line.length >= 2)
    .map((street) => ({ street, at: chipPlacement(view, street.line) }))
    .filter(({ at }) => inside(at))
  const { kept: chips, boxes } = keepFree(named.slice(0, MAX_CHIPS), ({ street, at }) => boxAround(at, street.name.length * 7.6 + 22, 26), corners)
  const { kept: shownTags } = keepFree(
    tags.map((tag) => ({ tag, at: toPercent(view, tag.at) })).filter(({ at }) => inside(at)),
    ({ tag, at }) => boxAround(at, 30 + tag.number.length * 8, 24),
    boxes
  )

  return (
    <div className="map-motif relative overflow-hidden" style={{ aspectRatio: `${view.width} / ${view.height}` }} role="img" aria-label={label}>
      {imageUrl && (
        // Remote image from Mapbox: the optimizer would only add a hop (and use the free image quota). Phones
        // load the light 1x image; the sharper @2x one (same area) is only requested from 768 px up.
        <picture>
          {imageUrl2x && <source media="(min-width: 768px)" srcSet={imageUrl2x} />}
          <img src={imageUrl} alt="" width={view.width} height={view.height} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
      )}
      <svg viewBox={`0 0 ${view.width} ${view.height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {streets
          .filter((s) => s.line.length >= 2)
          .map((s) => {
            const d = linePath(view, s.line)
            return (
              <g key={s.id}>
                <path d={d} stroke="#42210B" strokeWidth={s.provisional ? 7.5 : 9} vectorEffect="non-scaling-stroke" />
                <path d={d} stroke="#FF8506" strokeWidth={5.5} strokeDasharray={s.provisional ? '10 7' : undefined} vectorEffect="non-scaling-stroke" />
              </g>
            )
          })}
      </svg>
      {shownTags.map(({ tag, at }) => (
        <span key={tag.id} className="ntag ntag-public" style={{ left: `${at.left}%`, top: `${at.top}%` }}>
          <CategoryIcon category={tag.category} className="h-[13px] w-[13px]" />
          {tag.number}
        </span>
      ))}
      {chips.map(({ street, at }) => (
        <span
          key={street.id}
          className={`schip ${street.provisional ? 'schip-prov' : ''}`}
          style={{ left: `${at.left}%`, top: `${at.top}%`, transform: `translate(-50%, -50%) rotate(${at.angle}deg)` }}
        >
          {street.name}
        </span>
      ))}
      <span className="map-chip left-2.5 top-2.5">
        <i className="h-2.5 w-2.5 rounded-full bg-sun ring-2 ring-earth" />
        {chip}
      </span>
    </div>
  )
}
