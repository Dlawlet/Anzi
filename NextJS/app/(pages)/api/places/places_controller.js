import { NextResponse } from "next/server";
import Place from "../../../../models/placeModel.js";
import { DEVICE_COOKIE, deviceCookieOptions, newDeviceToken, verifyDeviceToken } from "../../../../utils/deviceToken.js";
import { generateCode, normalizeCode } from "../../../../utils/placeCode.js";
import { CONSENT_VERSION, publicPlace, validateNewPlace, validatePlacePatch } from "../../../../utils/placeValidation.js";
import { allow, clientIp, hashIp, sameOrigin } from "../../../../utils/rateLimit.js";
import { cleanSearch, escapeRegex } from "../../../../utils/validate.js";

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

const deviceIdFrom = (req) => verifyDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);

// Rejects cross-site writes and rate-limited callers. Returns a response, or null to continue.
async function guardWrite(req, scope, ipLimit) {
    if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
    if (!(await allow(scope, hashIp(clientIp(req)), ipLimit, 86400))) return json({ error: "Too many requests" }, 429);
    return null;
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
        const { errors, value } = validateNewPlace(body);
        if (errors.length > 0) return json({ error: "Invalid data", fields: errors }, 400);

        let place = null;
        for (let attempt = 0; attempt < 5 && !place; attempt++) {
            try {
                place = await Place.create({
                    code: generateCode(value.city),
                    location: { type: "Point", coordinates: [value.lng, value.lat] },
                    accuracyM: value.accuracyM,
                    name: value.name,
                    category: value.category,
                    houseNumber: value.houseNumber,
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
                });
            } catch (error) {
                if (error?.code !== 11000) throw error;
            }
        }
        if (!place) return json({ error: "Could not allocate a code, try again" }, 503);

        const response = json({ ...publicPlace(place), isOwner: true }, 201);
        if (newToken) response.cookies.set(DEVICE_COOKIE, newToken, deviceCookieOptions());
        return response;
    } catch (error) {
        if (error?.name === "ValidationError") return json({ error: "Invalid data" }, 400);
        return serverError(error);
    }
};

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
        return json({ ...publicPlace(place), isOwner }, 200);
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
            return json({ places: places.map((p) => ({ ...publicPlace(p), isOwner: true })) }, 200);
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
        return json({ places: places.map((p) => ({ ...publicPlace(p), isOwner: false })) }, 200);
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
        return json({ ...publicPlace(place), isOwner: true }, 200);
    } catch (error) {
        if (error?.name === "ValidationError") return json({ error: "Invalid data" }, 400);
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
        return json({ deleted: true }, 200);
    } catch (error) {
        return serverError(error);
    }
};
