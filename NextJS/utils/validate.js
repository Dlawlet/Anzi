export const MAX_SEARCH_LENGTH = 60;

// Escape regex metacharacters so user text is matched literally.
export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Trim and cap user-supplied search text; null when nothing usable is left.
export function cleanSearch(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.trim().slice(0, MAX_SEARCH_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

// Parse "lng,lat" into [lng, lat]; null unless both are finite and in range.
export function parseCoordinates(text) {
  if (typeof text !== "string") return null;
  const parts = text.split(",");
  if (parts.length !== 2 || parts.some((part) => part.trim() === "")) return null;
  const [lng, lat] = parts.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lng, lat];
}

// Strict 24-hex check: mongoose.isValidObjectId also accepts any 12-char string.
export function isValidId(id) {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}
