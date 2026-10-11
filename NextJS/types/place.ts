export type PlaceStreet = {
  id: string
  name: string
  lang: 'fr' | 'en'
  nameStatus: 'unnamed' | 'proposed' | 'accepted'
  nameSource: 'community' | 'osm' | 'official'
  quarter: string
  city: string
}

// Shape returned by /api/places (see publicPlace() in utils/placeValidation.js) plus the owner flag.
export type PlaceView = {
  code: string
  name: string
  category: string
  street: PlaceStreet | null
  houseNumber: number | null
  houseSuffix: string
  side: 'even' | 'odd' | null
  numberStatus: 'none' | 'waiting' | 'issued'
  officialNumber: string
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

// One row of GET /api/streets?near=lng,lat (streets_controller.js). `ideal` is null while the street waits for its line.
export type NearStreet = PlaceStreet & {
  lineStatus: 'waiting' | 'ready'
  count: 'few' | 'some' | 'many'
  distanceM: number
  ideal: { number: number; parity: 'even' | 'odd'; side: string } | null
}
