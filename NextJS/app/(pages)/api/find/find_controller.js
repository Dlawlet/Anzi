import { NextResponse } from "next/server";
import AddressLabel from "../../../../models/addressLabelModel.js";
import Place from "../../../../models/placeModel.js";
import Street from "../../../../models/streetModel.js";
import { nameWindows, parseQuery } from "../../../../utils/addressQuery.js";
import { DEVICE_COOKIE, verifyDeviceToken } from "../../../../utils/deviceToken.js";
import { publicPlace, publicStreet } from "../../../../utils/placeValidation.js";
import { allow, clientIp, hashIp } from "../../../../utils/rateLimit.js";
import { fold, nameKey } from "../../../../utils/streetNames.js";
import { streetLineOf, streetsById } from "../../../../utils/streetStore.js";
import { MAX_BEYOND_M, MIN_NUMBER, SLOT_M, lineLengthM, sideOfNumber, spotFor } from "../../../../utils/streetNumbering.js";
import { cleanSearch, escapeRegex } from "../../../../utils/validate.js";

const MAX_STREETS = 5;
const settled = (street) => (street.nameStatus === "accepted" ? 0 : 1); // accepted names first

const json = (body, status) => NextResponse.json(body, { status });

// The number is inside the street (plus the stretch past its ends that numbers are still issued for).
function numberExists(street, houseNumber) {
  if (houseNumber < MIN_NUMBER) return false;
  const s = street.originS + (Math.floor(houseNumber / 2) - street.baseSlot) * SLOT_M;
  return s >= -MAX_BEYOND_M && s <= lineLengthM(street.geometry.coordinates) + MAX_BEYOND_M;
}

// Which of the typed words is the street, which ones narrow it down (quarter, city). Null when it is not this street.
function matchStreet(street, windows, now) {
  const place = fold(`${street.quarter || ""} ${street.city || ""}`);
  const aliases = (street.aliases || []).filter((alias) => !alias.until || new Date(alias.until) > now);
  for (const window of windows) {
    const key = nameKey(window.name.join(" "));
    if (!key || !window.place.every((word) => place.includes(word))) continue;
    if (street.nameKey === key) return { match: "exact", formerName: null, narrowed: window.place.length };
    const alias = aliases.find((a) => a.nameKey === key);
    if (alias) return { match: "alias", formerName: alias.name, narrowed: window.place.length };
  }
  return null;
}

// GET /api/find?q= : one box for a street + number ("Manguier 12"), a backup code, or a public name.
// Privacy (docs/street-addressing.md 6.3): a street + number answers with the spot COMPUTED FROM THE LINE, the same
// body whether the number belongs to a link-only home, a private one, a retired one or nobody. The full card comes
// back only when the place is public.
export const findAddress = async (req) => {
  try {
    const raw = req.nextUrl.searchParams.get("q");
    const query = parseQuery(raw);
    if (query.type === "invalid") return json({ error: "Invalid search" }, 400);
    if (!(await allow("find-ip", hashIp(clientIp(req)), 60, 60))) return json({ error: "Too many requests" }, 429);
    const deviceId = verifyDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);

    if (query.type === "code") {
      const place = await Place.findOne({ code: query.code, status: "live" });
      const isOwner = Boolean(place && deviceId && place.ownerId === deviceId);
      // Private places look exactly like missing ones to everybody but the owner.
      if (!place || (place.visibility === "private" && !isOwner)) return json({ error: "Not found", query: { type: "code" } }, 404);
      const streets = await streetsById([place]);
      return json({ query: { type: "code" }, ambiguous: false, results: [{ kind: "place", place: { ...publicPlace(place, streets.get(String(place.streetId))), isOwner } }] }, 200);
    }

    if (query.type === "words") {
      const search = cleanSearch(query.text);
      if (!search) return json({ error: "Invalid search" }, 400);
      const places = await Place.find({ visibility: "public", status: "live", name: { $regex: escapeRegex(search), $options: "i" } }).limit(10);
      const streets = await streetsById(places);
      const results = places.map((p) => ({ kind: "place", place: { ...publicPlace(p, streets.get(String(p.streetId))), isOwner: false } }));
      if (results.length === 0) return json({ error: "Not found", query: { type: "words" } }, 404);
      return json({ query: { type: "words" }, ambiguous: results.length > 1, results }, 200);
    }

    const windows = nameWindows(query.words);
    const keys = [...new Set(windows.map((w) => nameKey(w.name.join(" "))).filter(Boolean))];
    const info = { type: "address", number: query.number, suffix: query.suffix };
    if (keys.length === 0) return json({ error: "Not found", query: info }, 404);

    const streets = await Street.find({
      status: "live",
      lineStatus: "ready",
      $or: [{ nameKey: { $in: keys } }, { "aliases.nameKey": { $in: keys } }],
    }).limit(30);

    const now = new Date();
    const candidates = streets
      .map((street) => ({ street, found: matchStreet(street, windows, now) }))
      .filter(({ street, found }) => found && numberExists(street, query.number))
      .sort((a, b) => b.found.narrowed - a.found.narrowed || settled(a.street) - settled(b.street))
      .slice(0, MAX_STREETS);

    // The label is read for every candidate, found or not, so the answer does not depend on who lives there.
    const results = await Promise.all(
      candidates.map(async ({ street, found }) => {
        const label = await AddressLabel.findOne({ streetId: street._id, houseNumber: query.number, houseSuffix: query.suffix });
        const place = label?.placeId ? await Place.findOne({ _id: label.placeId, visibility: "public", status: "live" }) : null;
        const spot = spotFor(streetLineOf(street), query.number);
        return {
          kind: "address",
          street: publicStreet(street),
          number: query.number,
          suffix: query.suffix,
          side: sideOfNumber(query.number),
          match: found.match,
          formerName: found.formerName,
          spot,
          place: place ? { ...publicPlace(place, street), isOwner: Boolean(deviceId && place.ownerId === deviceId) } : null,
        };
      })
    );
    if (results.length === 0) return json({ error: "Not found", query: info }, 404);
    return json({ query: info, ambiguous: results.length > 1, results }, 200);
  } catch (error) {
    console.error(error);
    return json({ error: "Internal Server Error" }, 500);
  }
};
