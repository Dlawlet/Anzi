import { Types } from "mongoose";
import { NextResponse } from "next/server";
import AddressLabel from "../../../../models/addressLabelModel.js";
import Place from "../../../../models/placeModel.js";
import Street from "../../../../models/streetModel.js";
import { DEVICE_COOKIE, deviceCookieOptions, newDeviceToken, verifyDeviceToken } from "../../../../utils/deviceToken.js";
import { formatManageKey, generateManageKey, hashManageKey, normalizeManageKey } from "../../../../utils/manageKey.js";
import { generateCode, normalizeCode } from "../../../../utils/placeCode.js";
import { CONSENT_VERSION, publicPlace, publicStreet, validateNewPlace, validatePlacePatch } from "../../../../utils/placeValidation.js";
import { allow, clientIp, hashIp, sameOrigin } from "../../../../utils/rateLimit.js";
import { allocateLabel, nameTakenNearby, nearbyStreets, streetsById } from "../../../../utils/streetStore.js";
import { MAX_BEYOND_M, distanceM, idealNumber, orientTrace, project } from "../../../../utils/streetNumbering.js";
import { validateStreetInput } from "../../../../utils/streetValidation.js";
import { cleanSearch, escapeRegex } from "../../../../utils/validate.js";

const NEARBY_STREET_M = 150; // streets considered when a new one is drawn
const DUPLICATE_STREET_M = 25; // a new street this close to an existing line is probably the same street
const WAITING_RADIUS_M = 200; // a place joins a street still waiting for its line only this near the anchor
const ACCEPT_AT_PLACES = 5; // houses on a street that make its proposed name final

const json = (body, status) => NextResponse.json(body, { status });
const serverError = (error) => {
    console.error(error);
    return json({ error: "Internal Server Error" }, 500);
};

async function readBody(req) {
    try {
        const body = await req.json();
        return body && typeof body === "object" && !Array.isArray(body) ? body : null;
    } catch {
        return null;
    }
}

const conflict = (reason, extra = {}) => json({ error: "Conflict", reason, ...extra }, 409);

const deviceIdFrom = (req) => verifyDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);

// Rejects cross-site writes and rate-limited callers. Returns a response, or null to continue.
async function guardWrite(req, scope, ipLimit) {
    if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
    if (!(await allow(scope, hashIp(clientIp(req)), ipLimit, 86400))) return json({ error: "Too many requests" }, 429);
    return null;
}

// Resolves the street part of a create request: finds or creates the street and checks the geometry.
// Returns { street, created } or { response } when the request must stop (404/409/429).
async function resolveStreet(request, value, deviceId, req) {
    const point = [value.lng, value.lat];

    if (request.kind === "join") {
        const street = await Street.findOne({ _id: request.streetId, status: "live" });
        if (!street) return { response: json({ error: "Not found" }, 404) };
        if (street.lineStatus === "waiting" && distanceM(street.geometry.coordinates, point) > WAITING_RADIUS_M) {
            return { response: conflict("too_far_from_street") };
        }
        return { street, created: false };
    }

    if (!(await allow("street-create-device", deviceId, 3, 86400))) return { response: json({ error: "Too many requests" }, 429) };
    if (!(await allow("street-create-ip", hashIp(clientIp(req)), 10, 86400))) return { response: json({ error: "Too many requests" }, 429) };

    const near = await nearbyStreets(point, NEARBY_STREET_M, 8);
    const ready = near.filter((s) => s.lineStatus === "ready");
    let line = null;
    if (request.line) {
        const oriented = orientTrace(request.line, ready.map((s) => s.geometry.coordinates));
        line = { line: oriented.line, baseSlot: oriented.baseSlot };
        const check = idealNumber({ line: line.line, originS: 0, baseSlot: line.baseSlot, evenSide: "right" }, point);
        if (check.error) return { response: conflict(check.error) };
    }

    if (!request.confirmNew) {
        for (const other of near) {
            if (isSameStreet(other, point)) return { response: conflict("street_exists_nearby", { street: publicStreet(other) }) };
        }
    }

    if (request.name && (await nameTakenNearby(request.name, point))) return { response: conflict("name_taken_nearby") };

    const street = await Street.create({
        name: request.name,
        nameKey: request.nameKey,
        lang: request.name ? request.lang : undefined,
        nameStatus: request.name ? "proposed" : "unnamed",
        nameSource: "community",
        proposedBy: request.name ? deviceId : undefined,
        aliases: [],
        geometry: line ? { type: "LineString", coordinates: line.line } : { type: "Point", coordinates: point },
        lineStatus: line ? "ready" : "waiting",
        lineSource: line ? "trace" : undefined,
        originS: line ? 0 : undefined,
        baseSlot: line ? line.baseSlot : undefined,
        evenSide: line ? "right" : undefined,
        lengthM: line ? request.lengthM : undefined,
        quarter: value.quarter || undefined,
        city: value.city,
        region: value.region,
        placeCount: 0,
        firstOwnerId: deviceId,
        status: "live",
    });
    return { street, created: true };
}

// Is the pin on (or right next to) this street? Then a "new street" is probably a duplicate.
function isSameStreet(street, point) {
    if (street.lineStatus !== "ready") return distanceM(street.geometry.coordinates, point) <= DUPLICATE_STREET_M;
    const { s, d, lengthM } = project(street.geometry.coordinates, point);
    return Math.abs(d) <= DUPLICATE_STREET_M && s >= -MAX_BEYOND_M && s <= lengthM + MAX_BEYOND_M;
}

export const createPlace = async (req) => {
    try {
        const blocked = await guardWrite(req, "create-ip", 30);
        if (blocked) return blocked;

        let deviceId = deviceIdFrom(req);
        let newToken = null;
        if (!deviceId) {
            ({ id: deviceId, token: newToken } = newDeviceToken());
        }
        if (!(await allow("create-device", deviceId, 10, 86400))) return json({ error: "Too many requests" }, 429);

        const body = await readBody(req);
        if (!body) return json({ error: "Invalid JSON body" }, 400);
        const checked = validateNewPlace(body);
        const streetInput = checked.errors.includes("body") ? { errors: [] } : validateStreetInput(body.street);
        const errors = [...checked.errors, ...streetInput.errors];
        if (errors.length > 0) return json({ error: "Invalid data", fields: errors }, 400);
        const value = checked.value;

        let street = null;
        let streetCreated = false;
        if (streetInput.value) {
            const resolved = await resolveStreet(streetInput.value, value, deviceId, req);
            if (resolved.response) return resolved.response;
            ({ street, created: streetCreated } = resolved);
        }

        // Number: issued now when the street has a line, otherwise it waits for the admin to draw one.
        const placeId = new Types.ObjectId();
        let numbering = { numberStatus: "none" };
        let label = null;
        if (street && street.lineStatus === "ready") {
            const issued = await allocateLabel(street, [value.lng, value.lat], placeId);
            if (issued.error === "no_label") {
                await undoCreate(null, streetCreated ? street : null);
                return json({ error: "Could not allocate a number, try again" }, 503);
            }
            if (issued.error) {
                await undoCreate(null, streetCreated ? street : null);
                return conflict(issued.error);
            }
            label = issued.label;
            numbering = {
                numberStatus: "issued", houseNumber: issued.houseNumber, houseSuffix: issued.houseSuffix,
                numberedAt: new Date(), alongM: issued.alongM, offsetM: issued.offsetM,
            };
        } else if (street) {
            numbering = { numberStatus: "waiting" };
        }

        // Shown once in the response; only its hash is stored.
        const manageKey = generateManageKey();
        let place = null;
        try {
            for (let attempt = 0; attempt < 5 && !place; attempt++) {
                try {
                    place = await Place.create({
                        _id: placeId,
                        code: generateCode(value.city),
                        location: { type: "Point", coordinates: [value.lng, value.lat] },
                        accuracyM: value.accuracyM,
                        name: value.name,
                        category: value.category,
                        streetId: street ? street._id : undefined,
                        ...numbering,
                        pinAdjusted: street ? value.pinAdjusted : undefined,
                        officialNumber: value.officialNumber || undefined,
                        quarter: value.quarter,
                        city: value.city,
                        region: value.region,
                        landmark: value.landmark,
                        visibility: value.visibility,
                        consentAt: new Date(),
                        consentVersion: CONSENT_VERSION,
                        adultOrParentOk: true,
                        status: "live",
                        ownerId: deviceId,
                        manageKeyHash: hashManageKey(manageKey),
                    });
                } catch (error) {
                    if (error?.code !== 11000) throw error;
                }
            }
        } finally {
            // The label and a street created for this request were never shown: give them back if the place was not stored.
            if (!place) await undoCreate(label, streetCreated ? street : null);
        }
        if (!place) return json({ error: "Could not allocate a code, try again" }, 503);

        if (street) await countPlace(street);

        const response = json({ ...publicPlace(place, street), isOwner: true, manageKey: formatManageKey(manageKey) }, 201);
        if (newToken) response.cookies.set(DEVICE_COOKIE, newToken, deviceCookieOptions());
        return response;
    } catch (error) {
        if (error?.name === "ValidationError") return json({ error: "Invalid data" }, 400);
        return serverError(error);
    }
};

async function undoCreate(label, street) {
    try {
        if (label) await AddressLabel.deleteOne({ _id: label._id });
        if (street) await Street.deleteOne({ _id: street._id });
    } catch (error) {
        console.error(error);
    }
}

// The place is already stored: a failed counter must not turn the request into an error.
async function countPlace(street) {
    try {
        await Street.updateOne({ _id: street._id }, { $inc: { placeCount: 1 } });
        // A street with five houses keeps the name its first registrant proposed.
        await Street.updateOne(
            { _id: street._id, nameStatus: "proposed", nameSource: "community", placeCount: { $gte: ACCEPT_AT_PLACES } },
            { $set: { nameStatus: "accepted" } }
        );
    } catch (error) {
        console.error(error);
    }
}

export const getPlaceByCode = async (req, rawCode) => {
    try {
        const code = normalizeCode(rawCode);
        if (!code) return json({ error: "Invalid code" }, 400);
        if (!(await allow("lookup-ip", hashIp(clientIp(req)), 60, 60))) return json({ error: "Too many requests" }, 429);

        const place = await Place.findOne({ code, status: "live" });
        const deviceId = deviceIdFrom(req);
        const isOwner = Boolean(place && deviceId && place.ownerId === deviceId);
        // Private places look exactly like missing ones to everybody but the owner.
        if (!place || (place.visibility === "private" && !isOwner)) return json({ error: "Not found" }, 404);
        const streets = await streetsById([place]);
        return json({ ...publicPlace(place, streets.get(String(place.streetId))), isOwner }, 200);
    } catch (error) {
        return serverError(error);
    }
};

export const listPlaces = async (req) => {
    try {
        const params = req.nextUrl.searchParams;

        if (params.get("mine") === "1") {
            const deviceId = deviceIdFrom(req);
            if (!deviceId) return json({ places: [] }, 200);
            const places = await Place.find({ ownerId: deviceId }).sort({ createdAt: -1 }).limit(50);
            const streets = await streetsById(places);
            return json({ places: places.map((p) => ({ ...publicPlace(p, streets.get(String(p.streetId))), isOwner: true })) }, 200);
        }

        const search = cleanSearch(params.get("search"));
        if (!search) return json({ error: "Invalid search" }, 400);
        if (!(await allow("search-ip", hashIp(clientIp(req)), 60, 60))) return json({ error: "Too many requests" }, 429);
        // Only places their owner chose to make public are searchable by name.
        const places = await Place.find({
            visibility: "public",
            status: "live",
            name: { $regex: escapeRegex(search), $options: "i" },
        }).limit(20);
        const streets = await streetsById(places);
        return json({ places: places.map((p) => ({ ...publicPlace(p, streets.get(String(p.streetId))), isOwner: false })) }, 200);
    } catch (error) {
        return serverError(error);
    }
};

export const updatePlace = async (req, rawCode) => {
    try {
        const blocked = await guardWrite(req, "edit-ip", 100);
        if (blocked) return blocked;
        const code = normalizeCode(rawCode);
        const deviceId = deviceIdFrom(req);
        if (!code) return json({ error: "Invalid code" }, 400);
        if (!deviceId) return json({ error: "Not found" }, 404);

        const body = await readBody(req);
        if (!body) return json({ error: "Invalid JSON body" }, 400);
        const { errors, value } = validatePlacePatch(body);
        if (errors.length > 0) return json({ error: "Invalid data", fields: errors }, 400);

        const place = await Place.findOneAndUpdate(
            { code, ownerId: deviceId, status: { $ne: "hidden" } },
            { $set: value },
            { returnDocument: "after", runValidators: true }
        );
        if (!place) return json({ error: "Not found" }, 404);
        const streets = await streetsById([place]);
        return json({ ...publicPlace(place, streets.get(String(place.streetId))), isOwner: true }, 200);
    } catch (error) {
        if (error?.name === "ValidationError") return json({ error: "Invalid data" }, 400);
        return serverError(error);
    }
};

// POST /api/places/claim { key } : the management key hands the address to this device (another phone, another
// browser, cleared data). No code is needed: the key alone finds the place. A wrong key and an unknown one answer
// the same 404; guessing a 61-bit key is stopped by the per-caller limit.
export const claimPlace = async (req) => {
    try {
        const blocked = await guardWrite(req, "claim-ip", 20);
        if (blocked) return blocked;

        const body = await readBody(req);
        const key = normalizeManageKey(body?.key);
        if (!key) return json({ error: "Invalid data", fields: ["key"] }, 400);

        const place = await Place.findOne({ manageKeyHash: hashManageKey(key), status: { $ne: "hidden" } });
        if (!place) return json({ error: "Not found" }, 404);

        let deviceId = deviceIdFrom(req);
        let newToken = null;
        if (!deviceId) ({ id: deviceId, token: newToken } = newDeviceToken());
        await Place.updateOne({ _id: place._id }, { $set: { ownerId: deviceId } });

        const streets = await streetsById([place]);
        const response = json({ ...publicPlace(place, streets.get(String(place.streetId))), isOwner: true }, 200);
        if (newToken) response.cookies.set(DEVICE_COOKIE, newToken, deviceCookieOptions());
        return response;
    } catch (error) {
        return serverError(error);
    }
};

export const deletePlace = async (req, rawCode) => {
    try {
        const blocked = await guardWrite(req, "edit-ip", 100);
        if (blocked) return blocked;
        const code = normalizeCode(rawCode);
        const deviceId = deviceIdFrom(req);
        if (!code) return json({ error: "Invalid code" }, 400);
        if (!deviceId) return json({ error: "Not found" }, 404);
        const place = await Place.findOneAndDelete({ code, ownerId: deviceId });
        if (!place) return json({ error: "Not found" }, 404);
        await retireLabel(place);
        return json({ deleted: true }, 200);
    } catch (error) {
        return serverError(error);
    }
};

// The label of a deleted place is retired, never reused; the street's counter goes down.
async function retireLabel(place) {
    if (!place.streetId) return;
    try {
        await AddressLabel.updateOne({ placeId: place._id }, { $set: { state: "retired" }, $unset: { placeId: "" } });
        await Street.updateOne({ _id: place.streetId, placeCount: { $gt: 0 } }, { $inc: { placeCount: -1 } });
    } catch (error) {
        console.error(error);
    }
}
