import { staticMapUrl, type MapView } from '@/utils/staticMap'

const WIDTH = 360
const HEIGHT = 200
const ZOOM = 17

// Metres per pixel at this latitude for 512 px tiles (Web Mercator).
const metresPerPixel = (lat: number) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** ZOOM)

// Small static map of the user's position: pin, accuracy circle, "your entrance" note. One plain image (about 25 kB)
// and no map JavaScript; without a token or offline the street-lines motif behind it stays.
export default function MiniMap(props: { lat: number; lng: number; accuracyM: number; label: string; note: string }) {
  const { lat, lng, accuracyM, label, note } = props
  const view: MapView = { center: [lng, lat], zoom: ZOOM, width: WIDTH, height: HEIGHT }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const radius = Math.min(Math.max(accuracyM / metresPerPixel(lat), 8), HEIGHT / 2 - 6)

  return (
    <div className="map-motif relative overflow-hidden rounded-2xl border-2 border-line" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }} role="img" aria-label={label}>
      {token && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={staticMapUrl(view, token)} alt="" width={WIDTH} height={HEIGHT} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={radius} fill="rgba(255,133,6,.16)" stroke="#FF8506" strokeWidth="2" strokeDasharray="5 4" />
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="9" fill="#42210B" stroke="#FFE2BF" strokeWidth="3" />
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="3" fill="#FF8506" />
      </svg>
      <span className="map-chip left-2.5 top-2.5 h-8 text-[13px]">{note}</span>
    </div>
  )
}
