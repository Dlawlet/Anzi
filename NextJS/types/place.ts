// Shape returned by /api/places (see publicPlace() in utils/placeValidation.js) plus the owner flag.
export type PlaceView = {
  code: string
  name: string
  category: string
  houseNumber: string
  quarter: string
  city: string
  region: string
  landmark: string
  lng: number
  lat: number
  accuracyM: number | null
  visibility: 'private' | 'link' | 'public'
  isOwner: boolean
}
