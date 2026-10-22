'use client'

import { useRef, useState } from 'react'
import { fromPixel, staticMapUrl, toPercent, toPixel, type MapView } from '@/utils/staticMap'

const WIDTH = 360
const HEIGHT = 240
const ZOOM = 18 // about 0.3 m per pixel: a house is a few dozen pixels wide
const EDGE = 10 // the pin stays this many pixels inside the image
const STEP_PX = 6 // one arrow key press

type Spot = { lat: number; lng: number }

// The map of step 1: a plain static image (no map JavaScript) around the starting position with a pin the user
// can drag, or move by tapping the image, so it sits on the right house. Arrow keys nudge it for keyboard users.
// The image is fixed around `origin`; the dashed circle is where the phone thinks it is.
export default function PinMap(props: {
  origin: Spot
  pin: Spot
  reading: Spot & { accuracyM: number }
  onPin: (spot: Spot) => void
  onReset: () => void
  moved: boolean
  labels: { map: string; note: string; reset: string; satellite: string; plan: string; help: string }
}) {
  const { origin, pin, reading, onPin, onReset, moved, labels } = props
  const [satellite, setSatellite] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const view: MapView = { center: [origin.lng, origin.lat], zoom: ZOOM, width: WIDTH, height: HEIGHT }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const toSpot = (x: number, y: number): Spot => {
    const [lng, lat] = fromPixel(view, Math.min(Math.max(x, EDGE), WIDTH - EDGE), Math.min(Math.max(y, EDGE), HEIGHT - EDGE))
    return { lat, lng }
  }
  const placeAt = (clientX: number, clientY: number) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    onPin(toSpot(((clientX - rect.left) / rect.width) * WIDTH, ((clientY - rect.top) / rect.height) * HEIGHT))
  }
  const nudge = (dx: number, dy: number) => {
    const now = toPixel(view, [pin.lng, pin.lat])
    onPin(toSpot(now.x + dx, now.y + dy))
  }

  const at = toPercent(view, [pin.lng, pin.lat])
  const read = toPercent(view, [reading.lng, reading.lat])
  const metresPerPixel = (40075016.686 * Math.cos((origin.lat * Math.PI) / 180)) / (512 * 2 ** ZOOM)
  const radius = Math.min(Math.max(reading.accuracyM / metresPerPixel, 8), HEIGHT)

  return (
    <div>
      <div
        ref={box}
        className="map-motif relative select-none overflow-hidden rounded-2xl border-2 border-line"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        role="group"
        aria-label={labels.map}
        onClick={(e) => placeAt(e.clientX, e.clientY)}
      >
        {token && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticMapUrl(view, token, { style: satellite ? 'mapbox/satellite-streets-v12' : 'mapbox/streets-v12' })}
            alt=""
            width={WIDTH}
            height={HEIGHT}
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx={(read.left / 100) * WIDTH} cy={(read.top / 100) * HEIGHT} r={radius} fill="rgba(255,133,6,.14)" stroke="#FF8506" strokeWidth="2" strokeDasharray="5 4" />
        </svg>
        <button
          type="button"
          aria-label={labels.note}
          className="absolute z-[1] -translate-x-1/2 -translate-y-full cursor-grab touch-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun active:cursor-grabbing"
          style={{ left: `${at.left}%`, top: `${at.top}%` }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => dragging.current && placeAt(e.clientX, e.clientY)}
          onPointerUp={(e) => {
            dragging.current = false
            e.currentTarget.releasePointerCapture(e.pointerId)
          }}
          onPointerCancel={() => {
            dragging.current = false
          }}
          onKeyDown={(e) => {
            const move: Record<string, [number, number]> = { ArrowLeft: [-STEP_PX, 0], ArrowRight: [STEP_PX, 0], ArrowUp: [0, -STEP_PX], ArrowDown: [0, STEP_PX] }
            const delta = move[e.key]
            if (!delta) return
            e.preventDefault()
            nudge(delta[0], delta[1])
          }}
        >
          <svg width="40" height="54" viewBox="0 0 50 66" aria-hidden="true">
            <path d="M25 64C25 64 4 40 4 24a21 21 0 0 1 42 0c0 16-21 40-21 40z" fill="#42210B" stroke="#FFE2BF" strokeWidth="3" />
            <circle cx="25" cy="24" r="9" fill="#FF8506" />
          </svg>
        </button>
        <span className="map-chip pointer-events-none left-2.5 top-2.5 h-8 text-[13px]">{labels.note}</span>
      </div>
      <p className="mt-2 text-base text-night-900">{labels.help}</p>
      <div className="mt-1 flex flex-wrap gap-x-4">
        {moved && (
          <button type="button" onClick={onReset} className="inline-flex min-h-12 items-center text-base font-bold text-clay-700 underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-clay">
            {labels.reset}
          </button>
        )}
        {token && (
          <button type="button" aria-pressed={satellite} onClick={() => setSatellite((v) => !v)} className="inline-flex min-h-12 items-center text-base font-bold text-clay-700 underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-clay">
            {satellite ? labels.plan : labels.satellite}
          </button>
        )}
      </div>
    </div>
  )
}
