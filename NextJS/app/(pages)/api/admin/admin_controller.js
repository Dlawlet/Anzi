import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import Place from "../../../../models/placeModel.js";
import Street from "../../../../models/streetModel.js";
import TrustedIp from "../../../../models/trustedIpModel.js";
import { allow, clientIp, hashIp, sameOrigin } from "../../../../utils/rateLimit.js";
import { OVERPASS_URL, overpassQuery, proposalsFrom } from "../../../../utils/osmTrace.js";
import { allocateLabel, nameTakenNearby } from "../../../../utils/streetStore.js";
import { validateStreetName } from "../../../../utils/streetNames.js";
import { BASE_FULL, extendLine, validateLine } from "../../../../utils/streetNumbering.js";
import { LANGS } from "../../../../utils/streetValidation.js";
import { isValidId } from "../../../../utils/validate.js";

// Moderator tools: draw street lines, number the waiting places, fix street names.
// Authorization: Bearer <ADMIN_TOKEN> (server-only secret, at least 32 characters).
const json = (body, status) => NextResponse.json(body, { status });
const serverError = (error) => {
    console.error(error);
    return json({ error: "Internal Server Error" }, 500);
};
const conflict = (reason) => json({ error: "Conflict", reason }, 409);

const QUEUE_LIMIT = 50;
const NUMBER_BATCH = 500;

const digest = (text) => createHash("sha256").update(text).digest();

function tokenMatches(req) {
    const secret = process.env.ADMIN_TOKEN;
    if (!secret || secret.length < 32) return false; // no usable secret = admin closed
    const match = /^Bearer (.{1,500})$/.exec(req.headers.get("authorization") || "");
    return Boolean(match) && timingSafeEqual(digest(match[1]), digest(secret));
}

// Throttles by IP first (failed guesses count too), then checks origin on writes and the token.
async function guardAdmin(req, write) {
    if (!(await allow("admin-ip", hashIp(clientIp(req)), 300, 86400))) return json({ error: "Too many requests" }, 429);
    if (write && !sameOrigin(req)) return json({ error: "Forbidden" }, 403);
    if (!tokenMatches(req)) return json({ error: "Unauthorized" }, 401);
    return null;
}

async function readBody(req) {
    try {
        const body = await req.json();
        return body && typeof body === "object" && !Array.isArray(body) ? body : null;
    } catch {
        return null;
    }
}

// Admin view of a street: the moderator may see the position, the public may not.
const adminStreet = (street) => ({
    id: String(street._id),
    name: street.name || "",
    lang: street.lang || "fr",
    nameStatus: street.nameStatus,
    nameSource: street.nameSource,
    lineStatus: street.lineStatus,
    quarter: street.quarter || "",
    city: street.city,
    placeCount: street.placeCount,
    anchor: street.geometry.type === "Point" ? street.geometry.coordinates : street.geometry.coordinates[0],
    line: street.geometry.type === "LineString" ? street.geometry.coordinates : null,
    createdAt: street.createdAt,
});

// GET /api/admin/queue : streets waiting for a line, and provisional names to accept or fix.
export const getQueue = async (req) => {
    try {
        const denied = await guardAdmin(req, false);
        if (denied) return denied;
        const [waiting, proposed] = await Promise.all([
            Street.find({ status: "live", lineStatus: "waiting" }).sort({ createdAt: 1 }).limit(QUEUE_LIMIT),
            Street.find({ status: "live", nameStatus: "proposed" }).sort({ createdAt: 1 }).limit(QUEUE_LIMIT),
        ]);
        return json({ waiting: waiting.map(adminStreet), proposed: proposed.map(adminStreet) }, 200);
    } catch (error) {
        return serverError(error);
    }
};

// Numbers the places that waited for a line, in creation order. A place too far from the new line stays waiting.
async function numberWaitingPlaces(street) {
    const places = await Place.find({ streetId: street._id, numberStatus: "waiting", status: "live" })
        .sort({ createdAt: 1 })
        .limit(NUMBER_BATCH);
    let numbered = 0;
    let skipped = 0;
    for (const place of places) {
        const issued = await allocateLabel(street, place.location.coordinates, place._id);
        if (issued.error) {
            skipped++;
            continue;
        }
        await Place.updateOne(
            { _id: place._id, numberStatus: "waiting" },
            { $set: { houseNumber: issued.houseNumber, houseSuffix: issued.houseSuffix, numberStatus: "issued", numberedAt: new Date(), alongM: issued.alongM, offsetM: issued.offsetM } }
        );
        numbered++;
    }
    return { numbered, skipped };
}

// POST /api/admin/trust-ip { on: boolean, hours?: 1..72 } : trust (or stop trusting) the caller's own IP for testing.
// A trusted IP does not need to stand at the house picked on the map. Expires on its own (default 24 h).
export const setTrustedIp = async (req) => {
    try {
        const denied = await guardAdmin(req, true);
        if (denied) return denied;
        const body = await readBody(req);
        if (!body || typeof body.on !== "boolean") return json({ error: "Invalid JSON body" }, 400);
        const ipHash = hashIp(clientIp(req));
        if (!body.on) {
            await TrustedIp.deleteOne({ ipHash });
            return json({ trusted: false }, 200);
        }
        const hours = Number.isInteger(body.hours) && body.hours >= 1 && body.hours <= 72 ? body.hours : 24;
        const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
        await TrustedIp.findOneAndUpdate({ ipHash }, { $set: { expiresAt } }, { upsert: true });
        return json({ trusted: true, expiresAt }, 200);
    } catch (error) {
        return serverError(error);
    }
};

// GET /api/admin/streets/[id]/suggest-line : up to 3 OpenStreetMap roads next to the street's point, as drawable lines.
// Only a proposal: nothing is saved until the moderator saves a line.
export const suggestStreetLine = async (req, id) => {
    try {
        const denied = await guardAdmin(req, false);
        if (denied) return denied;
        if (!isValidId(id)) return json({ error: "Invalid id" }, 400);
        const street = await Street.findOne({ _id: id, status: "live" });
        if (!street) return json({ error: "Not found" }, 404);
        if (street.lineStatus !== "waiting") return conflict("line_exists");

        const anchor = adminStreet(street).anchor;
        let elements;
        try {
            const res = await fetch(OVERPASS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Anzi/0.1 (street line proposals)" },
                body: `data=${encodeURIComponent(overpassQuery(anchor))}`,
                signal: AbortSignal.timeout(9000),
            });
            if (!res.ok) return json({ error: "Map service unavailable" }, 502);
            elements = (await res.json()).elements;
        } catch {
            return json({ error: "Map service unavailable" }, 502);
        }
        const proposals = proposalsFrom(elements, anchor, street.name).filter((p) => !validateLine(p.line, "moderator").error);
        return json({ proposals }, 200);
    } catch (error) {
        return serverError(error);
    }
};

// POST /api/admin/streets/[id]/line { line: [[lng, lat], ...] }
// First line of a waiting street, or an extension of a used line (only vertices at the ends may be added).
// Sending the current line again just numbers the places still waiting.
export const setStreetLine = async (req, id) => {
    try {
        const denied = await guardAdmin(req, true);
        if (denied) return denied;
        if (!isValidId(id)) return json({ error: "Invalid id" }, 400);
        const body = await readBody(req);
        if (!body) return json({ error: "Invalid JSON body" }, 400);
        const checked = validateLine(body.line, "moderator");
        if (checked.error) return json({ error: "Invalid data", fields: ["line"] }, 400);

        const street = await Street.findOne({ _id: id, status: "live" });
        if (!street) return json({ error: "Not found" }, 404);

        let updated;
        if (street.lineStatus === "waiting") {
            updated = await Street.findOneAndUpdate(
                { _id: id, lineStatus: "waiting" },
                {
                    $set: {
                        geometry: { type: "LineString", coordinates: checked.line },
                        lineStatus: "ready", lineSource: "moderator", originS: 0, baseSlot: BASE_FULL, evenSide: "right",
                        lengthM: checked.lengthM,
                    },
                },
                { returnDocument: "after" }
            );
            if (!updated) return conflict("line_changed"); // another request drew it first
        } else {
            let next;
            try {
                next = extendLine({ line: street.geometry.coordinates, originS: street.originS }, checked.line);
            } catch {
                return conflict("line_frozen");
            }
            if (next.lengthM > 3000) return json({ error: "Invalid data", fields: ["line"] }, 400);
            updated = await Street.findOneAndUpdate(
                { _id: id, originS: street.originS },
                { $set: { "geometry.coordinates": next.line, originS: next.originS, lengthM: next.lengthM } },
                { returnDocument: "after" }
            );
            if (!updated) return conflict("line_changed");
        }

        const counts = await numberWaitingPlaces(updated);
        return json({ street: adminStreet(updated), ...counts }, 200);
    } catch (error) {
        return serverError(error);
    }
};

// POST /api/admin/streets/[id]/name { action: "set" | "official" | "accept" | "reject", name?, lang?, officialSource? }
export const setStreetName = async (req, id) => {
    try {
        const denied = await guardAdmin(req, true);
        if (denied) return denied;
        if (!isValidId(id)) return json({ error: "Invalid id" }, 400);
        const body = await readBody(req);
        if (!body) return json({ error: "Invalid JSON body" }, 400);

        const street = await Street.findOne({ _id: id, status: "live" });
        if (!street) return json({ error: "Not found" }, 404);

        if (body.action === "accept") {
            const accepted = await Street.findOneAndUpdate(
                { _id: id, nameStatus: "proposed" },
                { $set: { nameStatus: "accepted" } },
                { returnDocument: "after" }
            );
            return accepted ? json({ street: adminStreet(accepted) }, 200) : conflict("no_proposal");
        }

        if (body.action === "reject") {
            if (street.nameStatus === "unnamed") return conflict("no_name");
            const cleared = await Street.findOneAndUpdate(
                { _id: id },
                { $set: { nameStatus: "unnamed", nameSource: "community" }, $unset: { name: "", nameKey: "", lang: "", proposedBy: "" } },
                { returnDocument: "after" }
            );
            return json({ street: adminStreet(cleared) }, 200);
        }

        if (body.action !== "set" && body.action !== "official") return json({ error: "Invalid data", fields: ["action"] }, 400);
        const checked = validateStreetName(body.name);
        if (checked.error) return json({ error: "Invalid data", fields: ["name"] }, 400);
        const lang = body.lang == null ? street.lang || "fr" : body.lang;
        if (!LANGS.includes(lang)) return json({ error: "Invalid data", fields: ["lang"] }, 400);
        let officialSource;
        if (body.action === "official") {
            officialSource = typeof body.officialSource === "string" ? body.officialSource.trim().slice(0, 200) : "";
            if (officialSource.length < 3) return json({ error: "Invalid data", fields: ["officialSource"] }, 400);
        }

        if (await nameTakenNearby(checked.name, street.geometry.type === "Point" ? street.geometry.coordinates : street.geometry.coordinates[0], street._id)) {
            return conflict("name_taken_nearby");
        }

        // The previous name keeps working as an alias.
        const update = {
            $set: {
                name: checked.name, nameKey: checked.key, lang, nameStatus: "accepted",
                nameSource: body.action === "official" ? "official" : "community",
                ...(officialSource ? { officialSource, officialAt: new Date() } : {}),
            },
        };
        if (street.name && street.nameKey !== checked.key) {
            update.$push = {
                aliases: { name: street.name, nameKey: street.nameKey, reason: body.action === "official" ? "official" : "renamed", until: new Date() },
            };
        }
        const renamed = await Street.findOneAndUpdate({ _id: id }, update, { returnDocument: "after" });
        return json({ street: adminStreet(renamed) }, 200);
    } catch (error) {
        return serverError(error);
    }
};
