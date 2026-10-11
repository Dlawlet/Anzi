import { unstable_cache } from 'next/cache'
import Street from '../models/streetModel.js'
import Place from '../models/placeModel.js'
import { connectToDatabase } from './connectMongo.js'
import type { LngLat } from './staticMap'

// What the Home map card shows: a few live streets with their lines and the public places on them.
// Public fields only (name, line, number, category); private and link-only addresses never appear here.
export type HomeStreet = { id: string; name: string; provisional: boolean; line: LngLat[] }
export type HomeTag = { id: string; number: string; category: string; at: LngLat }
export type HomeMapData = { streets: HomeStreet[]; tags: HomeTag[]; streetCount: number; placeCount: number }

const MAX_STREETS = 8
const MAX_POINTS = 24 // per line: the line is drawn small, and it travels in the page
const MAX_TAGS = 40
const TIMEOUT_MS = 2500

// Keeps the shape with fewer points, rounded to ~1 m.
const thin = (line: LngLat[]): LngLat[] => {
  const step = Math.max(1, Math.ceil((line.length - 1) / (MAX_POINTS - 1)))
  const out = line.filter((_, i) => i % step === 0 || i === line.length - 1)
  return out.map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])
}

async function load(): Promise<HomeMapData> {
  await connectToDatabase()
  const [streetCount, placeCount, streets] = await Promise.all([
    Street.countDocuments({ status: 'live' }),
    Place.countDocuments({ status: 'live' }),
    Street.find({ status: 'live', lineStatus: 'ready', 'geometry.type': 'LineString' })
      .sort({ placeCount: -1 })
      .limit(MAX_STREETS)
      .select('name nameStatus geometry')
      .lean(),
  ])
  const ids = streets.map((s: { _id: unknown }) => s._id)
  const places = ids.length
    ? await Place.find({ streetId: { $in: ids }, visibility: 'public', status: 'live', numberStatus: 'issued' })
        .limit(MAX_TAGS)
        .select('houseNumber houseSuffix category location')
        .lean()
    : []
  return {
    streetCount,
    placeCount,
    streets: streets.map((s: { _id: unknown; name?: string; nameStatus: string; geometry: { coordinates: LngLat[] } }) => ({
      id: String(s._id),
      name: s.name || '',
      provisional: s.nameStatus !== 'accepted',
      line: thin(s.geometry.coordinates),
    })),
    tags: places.map((p: { _id: unknown; houseNumber: number; houseSuffix?: string; category: string; location: { coordinates: LngLat } }) => ({
      id: String(p._id),
      number: `${p.houseNumber}${p.houseSuffix || ''}`,
      category: p.category,
      at: p.location.coordinates,
    })),
  }
}

const cached = unstable_cache(load, ['home-map-v1'], { revalidate: 600 })

// Never throws and never waits long: Home must paint even with no database (first run, outage, offline dev).
export async function getHomeMap(): Promise<HomeMapData | null> {
  if (!process.env.MONGODB_URI) return null
  try {
    return await Promise.race([
      cached(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ])
  } catch (error) {
    console.error('home map unavailable', error)
    return null
  }
}
