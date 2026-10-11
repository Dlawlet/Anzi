import { BOUNDS } from './placeValidation.js'

export type GpsQuality = 'good' | 'fair' | 'weak' | 'poor'

// Metres. "poor" (cell-tower level) is refused: such a pin would send a rider to the wrong street.
export const GPS_GOOD_M = 30
export const GPS_FAIR_M = 100
export const GPS_MAX_M = 1000

export function gpsQuality(accuracyM: number): GpsQuality {
  if (accuracyM <= GPS_GOOD_M) return 'good'
  if (accuracyM <= GPS_FAIR_M) return 'fair'
  if (accuracyM <= GPS_MAX_M) return 'weak'
  return 'poor'
}

export function inCameroon(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1] && lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1]
  )
}
