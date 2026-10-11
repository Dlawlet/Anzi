import { NextResponse } from "next/server";
import Street from "../../../../models/streetModel.js";
import { BOUNDS, publicStreet } from "../../../../utils/placeValidation.js";
import { allow, clientIp, hashIp } from "../../../../utils/rateLimit.js";
import { countBucket, nearbyStreets } from "../../../../utils/streetStore.js";
import { distanceM, idealNumber, milestones, sideOfNumber } from "../../../../utils/streetNumbering.js";
import { isValidId, parseCoordinates } from "../../../../utils/validate.js";

const REACH_M = 150; // streets offered to a user standing at a pin
const MAX_RESULTS = 5;

const json = (body, status) => NextResponse.json(body, { status });
const serverError = (error) => {
    console.error(error);
    return json({ error: "Internal Server Error" }, 500);
};

const inBounds = ([lng, lat]) => lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1] && lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1];
const lineOf = (street) => ({
    line: street.geometry.coordinates,
    originS: street.originS,
    baseSlot: street.baseSlot,
    evenSide: street.evenSide,
});

// GET /api/streets?near=lng,lat : streets around a pin, nearest first, with the number each would give.
// The preview never looks at which numbers are taken, so it reveals nothing about registered homes.
export const listNearbyStreets = async (req) => {
    try {
        const near = parseCoordinates(req.nextUrl.searchParams.get("near"));
        if (!near || !inBounds(near)) return json({ error: "Invalid location" }, 400);
        if (!(await allow("streets-ip", hashIp(clientIp(req)), 60, 60))) return json({ error: "Too many requests" }, 429);

        const streets = await nearbyStreets(near, REACH_M, 8);
        const results = [];
        for (const street of streets) {
            const base = { ...publicStreet(street), lineStatus: street.lineStatus, count: countBucket(street.placeCount) };
            if (street.lineStatus === "waiting") {
                results.push({ ...base, distanceM: Math.round(distanceM(street.geometry.coordinates, near)), ideal: null });
                continue;
            }
            const ideal = idealNumber(lineOf(street), near);
            if (ideal.error) continue;
            results.push({
                ...base,
                distanceM: Math.round(Math.abs(ideal.offsetM)),
                ideal: { number: ideal.n, parity: sideOfNumber(ideal.n), side: ideal.side },
            });
        }
        results.sort((a, b) => a.distanceM - b.distanceM);
        return json({ streets: results.slice(0, MAX_RESULTS) }, 200);
    } catch (error) {
        return serverError(error);
    }
};

// GET /api/streets/[id] : the public face of a street. Milestone tags come from geometry, not from registrations.
export const getStreet = async (req, id) => {
    try {
        if (!isValidId(id)) return json({ error: "Invalid id" }, 400);
        if (!(await allow("streets-ip", hashIp(clientIp(req)), 60, 60))) return json({ error: "Too many requests" }, 429);
        const street = await Street.findOne({ _id: id, status: "live" });
        if (!street) return json({ error: "Not found" }, 404);
        return json(
            {
                ...publicStreet(street),
                aliases: (street.aliases || []).map((alias) => ({ name: alias.name, reason: alias.reason })),
                lineStatus: street.lineStatus,
                count: countBucket(street.placeCount),
                milestones: street.lineStatus === "ready" ? milestones(lineOf(street)) : [],
            },
            200
        );
    } catch (error) {
        return serverError(error);
    }
};
