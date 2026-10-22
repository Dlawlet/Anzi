// "Are you at that house?" (docs: create flow). Pure and shared by the phone and the server.
export const PRESENCE_RADIUS_M = 100; // a house picked on the map: the phone must be within this distance
export const MAX_PIN_OFFSET_M = 250; // the pin may be moved this far from the phone's own reading

const EARTH_M = 6371008.8;
const rad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in metres between two { lat, lng } points.
export function metresBetween(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Distance still to walk to the target, in metres, or 0 when the phone is near enough. A poor reading (up to 50 m)
// gets the benefit of the doubt.
export function metresToTarget(fix, target) {
  const away = metresBetween(fix, target) - Math.min(Math.max(fix.accuracyM || 0, 0), 50);
  return away > PRESENCE_RADIUS_M ? Math.round(away) : 0;
}

export function pinIsCoherent(fix, pin) {
  return metresBetween(fix, pin) <= MAX_PIN_OFFSET_M;
}
