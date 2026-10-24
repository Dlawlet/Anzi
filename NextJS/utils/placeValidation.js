import { pinIsCoherent } from "./presence.js";

export const CONSENT_VERSION = "2026-10-v1";
export const CATEGORIES = ["home", "shop", "salon", "restaurant", "office", "other"];
export const VISIBILITIES = ["private", "link", "public"];
export const REGIONS = [
  "Adamaoua", "Centre", "Est", "Extreme-Nord", "Littoral",
  "Nord", "Nord-Ouest", "Ouest", "Sud", "Sud-Ouest",
];
// Set by the server only (street addressing); sending any of them is a 400.
const SERVER_OWNED = ["houseNumber", "houseSuffix", "numberStatus", "streetId"];
// Cameroon bounding box plus a margin.
export const BOUNDS = { lng: [7.5, 17], lat: [1, 14] };

const clean = (value, max) => {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : null;
};

// Validates a create request. Never trusts status, code, ownerId or consent fields from the client.
export function validateNewPlace(body) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) return { errors: ["body"] };

  const lng = Number(body.lng);
  const lat = Number(body.lat);
  const inBox =
    Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1] && lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1];
  if (!inBox) errors.push("location");
  // The phone's own reading may come along: the pin cannot be put far from where the phone says it is.
  if (inBox && body.fix != null) {
    const fix = { lng: Number(body.fix.lng), lat: Number(body.fix.lat) };
    if (!Number.isFinite(fix.lng) || !Number.isFinite(fix.lat) || !pinIsCoherent(fix, { lng, lat })) errors.push("location");
  }

  const name = clean(body.name, 80);
  if (!name || name.length < 2) errors.push("name");
  const city = clean(body.city, 60);
  if (!city || city.length < 2) errors.push("city");
  const landmark = body.landmark == null || body.landmark === "" ? "" : clean(body.landmark, 140);
  if (landmark === null) errors.push("landmark");
  const quarter = body.quarter == null || body.quarter === "" ? "" : clean(body.quarter, 60);
  if (quarter === null) errors.push("quarter");
  const officialNumber = body.officialNumber == null || body.officialNumber === "" ? "" : clean(body.officialNumber, 20);
  if (officialNumber === null) errors.push("officialNumber");
  // The number is issued by the server from the street line; a client that sends one gets a 400.
  for (const key of SERVER_OWNED) if (key in body) errors.push(key);
  if (body.pinAdjusted != null && typeof body.pinAdjusted !== "boolean") errors.push("pinAdjusted");

  if (!CATEGORIES.includes(body.category)) errors.push("category");
  if (!REGIONS.includes(body.region)) errors.push("region");
  const visibility = body.visibility == null ? "link" : body.visibility;
  if (!VISIBILITIES.includes(visibility)) errors.push("visibility");

  let accuracyM;
  if (body.accuracyM != null) {
    accuracyM = Number(body.accuracyM);
    if (!Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 100000) errors.push("accuracyM");
  }

  if (body.consent !== true) errors.push("consent");
  if (body.adultOrParentOk !== true) errors.push("adultOrParentOk");

  if (errors.length > 0) return { errors };
  return {
    errors,
    value: { name, city, landmark, quarter, officialNumber, pinAdjusted: body.pinAdjusted === true, category: body.category, region: body.region, visibility, accuracyM, lng, lat },
  };
}

// Owner edit: only these fields may change; each is validated like on create.
export function validatePlacePatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { errors: ["body"] };
  const errors = [];
  const patch = {};
  const text = (key, max, min = 0) => {
    if (!(key in body)) return;
    const value = clean(body[key], max);
    if (value === null || value.length < min) errors.push(key);
    else patch[key] = value;
  };
  text("name", 80, 2);
  text("landmark", 140);
  text("quarter", 60);
  text("officialNumber", 20);
  if ("category" in body) CATEGORIES.includes(body.category) ? (patch.category = body.category) : errors.push("category");
  if ("visibility" in body) VISIBILITIES.includes(body.visibility) ? (patch.visibility = body.visibility) : errors.push("visibility");
  if (Object.keys(patch).length === 0 && errors.length === 0) errors.push("empty");
  return { errors, value: patch };
}

// Street data a visitor may see. No device ids, proposals or geometry.
export function publicStreet(street) {
  if (!street) return null;
  return {
    id: String(street._id),
    name: street.name || "",
    lang: street.lang || "fr",
    nameStatus: street.nameStatus,
    nameSource: street.nameSource,
    quarter: street.quarter || "",
    city: street.city,
    postalCode: street.postalCode || "",
  };
}

// Fields a visitor may see. No ownerId, consent data, moderation status or numbering audit values.
export function publicPlace(place, street = null) {
  const [lng, lat] = place.location.coordinates;
  const numbered = place.numberStatus === "issued" && Number.isInteger(place.houseNumber);
  return {
    code: place.code,
    name: place.name,
    category: place.category,
    street: publicStreet(street),
    houseNumber: numbered ? place.houseNumber : null,
    houseSuffix: numbered ? place.houseSuffix || "" : "",
    side: numbered ? (place.houseNumber % 2 === 0 ? "even" : "odd") : null,
    numberStatus: place.numberStatus || "none",
    officialNumber: place.officialNumber || "",
    quarter: place.quarter || "",
    city: place.city,
    region: place.region,
    landmark: place.landmark || "",
    lng,
    lat,
    accuracyM: place.accuracyM ?? null,
    visibility: place.visibility,
  };
}

// Moderation (docs/street-addressing.md): a new place waits for the admin; a refusal tells its owner why.
export const PLACE_STATUSES = ["pending", "live", "refused", "hidden"];
export const REFUSAL_REASONS = ["no_building", "wrong_spot", "bad_name", "duplicate", "test", "other"];
export const NAME_REFUSAL_REASONS = ["unacceptable", "not_local", "not_a_name", "other"];
const NOTE_MAX = 200;

// Validates an admin decision. `reasons` is the list the refusal must pick from. The note is shown to the owner.
export function validateReview(body, reasons) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { errors: ["body"] };
  const errors = [];
  if (body.action !== "approve" && body.action !== "refuse") errors.push("action");
  if (body.action === "refuse" && !reasons.includes(body.reason)) errors.push("reason");
  const note = body.note == null || body.note === "" ? "" : clean(body.note, NOTE_MAX);
  if (note === null) errors.push("note");
  if (body.action === "refuse" && body.reason === "other" && !note) errors.push("note");
  return errors.length > 0 ? { errors } : { errors, value: { action: body.action, reason: body.reason, note } };
}

const notice = (n) => (n && n.reason ? { reason: n.reason, note: n.note || "", at: n.at } : null);

// What the owner sees of their own place: the public fields plus where moderation stands.
export function ownerPlace(place, street = null) {
  const nameNotice = notice(place.nameNotice);
  return {
    ...publicPlace(place, street),
    isOwner: true,
    status: place.status === "pending" || place.status === "refused" ? place.status : "live",
    refusal: place.status === "refused" ? notice(place.review) : null,
    nameNotice: nameNotice ? { ...nameNotice, name: place.nameNotice.name || "" } : null,
  };
}
