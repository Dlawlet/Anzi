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

const ACCEPT_AT_PLACES = 5; // approved houses on a street that make its proposed name final

// An approved place counts on its street. The place is already stored: a failed counter must not fail the request.
export async function countPlace(streetId) {
  try {
    await Street.updateOne({ _id: streetId }, { $inc: { placeCount: 1 } });
    // A street with five houses keeps the name its first registrant proposed.
    await Street.updateOne(
      { _id: streetId, nameStatus: "proposed", nameSource: "community", placeCount: { $gte: ACCEPT_AT_PLACES } },
      { $set: { nameStatus: "accepted" } }
    );
  } catch (error) {
    console.error(error);
  }
}

// The label of a deleted or refused place is retired, never reused. Only a place that was counted (live) uncounts.
export async function retireLabel(place, counted) {
  if (!place.streetId) return;
  try {
    await AddressLabel.updateOne({ placeId: place._id }, { $set: { state: "retired" }, $unset: { placeId: "" } });
    if (counted) await Street.updateOne({ _id: place.streetId, placeCount: { $gt: 0 } }, { $inc: { placeCount: -1 } });
  } catch (error) {
    console.error(error);
  }
}
