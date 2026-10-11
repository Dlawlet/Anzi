import AddressLabel from "../models/addressLabelModel.js";
import Street from "../models/streetModel.js";
import { NAME_RADIUS_M, clashesWith } from "./streetNames.js";
import { candidates, idealNumber } from "./streetNumbering.js";

// Database helpers shared by the places, streets and admin controllers.
export const streetLineOf = (street) => ({
  line: street.geometry.coordinates,
  originS: street.originS,
  baseSlot: street.baseSlot,
  evenSide: street.evenSide,
});

// Count shown to the public is bucketed so a street page never says how many homes are registered.
export const countBucket = (count) => (count < 5 ? "few" : count < 20 ? "some" : "many");

const nearSphere = (point, maxDistance) => ({
  $nearSphere: { $geometry: { type: "Point", coordinates: point }, $maxDistance: maxDistance },
});

export const nearbyStreets = (point, maxDistance, limit) =>
  Street.find({ status: "live", geometry: nearSphere(point, maxDistance) }).limit(limit);

// Issues a label on a ready street: the ideal number, the neighbouring slot, then letters. Returns the issued
// label with the numbering audit values, or { error } ("too_far_from_street", "past_street_end", "no_label").
export async function allocateLabel(street, point, placeId) {
  const ideal = idealNumber(streetLineOf(street), point);
  if (ideal.error) return { error: ideal.error };
  for (const candidate of candidates(ideal)) {
    try {
      const label = await AddressLabel.create({ streetId: street._id, ...candidate, placeId, state: "active" });
      return { label, ...candidate, alongM: ideal.alongM, offsetM: ideal.offsetM };
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  return { error: "no_label" };
}

// True when another street within 2 km already has this name (or one that sounds like it), old names included.
export async function nameTakenNearby(name, point, excludeId = null) {
  const filter = { status: "live", nameStatus: { $ne: "unnamed" }, geometry: nearSphere(point, NAME_RADIUS_M) };
  if (excludeId) filter._id = { $ne: excludeId };
  const near = await Street.find(filter).select("name aliases").limit(200);
  const used = near.flatMap((street) => [street.name, ...(street.aliases || []).map((alias) => alias.name)]).filter(Boolean);
  return clashesWith(name, used);
}

// Streets of a list of places, by id (one query).
export async function streetsById(places) {
  const ids = [...new Set(places.map((place) => place.streetId && String(place.streetId)).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const streets = await Street.find({ _id: { $in: ids } });
  return new Map(streets.map((street) => [String(street._id), street]));
}
