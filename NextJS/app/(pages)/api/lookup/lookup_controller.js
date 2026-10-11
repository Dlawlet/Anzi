import { NextResponse } from "next/server";
import Address from "../../../../models/addressModel.js";
import { allow, clientIp, hashIp } from "../../../../utils/rateLimit.js";
import { cleanSearch, escapeRegex } from "../../../../utils/validate.js";

const MAX_WORDS = 5;
const MAX_MATCHES = 10;

const json = (body, status) => NextResponse.json(body, { status });

// Transition bridge: finds addresses of the old `Address` collection by free text ("Idriss 138"), every word
// must appear in the stored name. Location and label only: no description or contact data leaves the server.
// Goes away with the legacy model (status.md, next steps).
export const lookupAddresses = async (req) => {
    try {
        const search = cleanSearch(req.nextUrl.searchParams.get("q"));
        if (!search) return json({ error: "Invalid search" }, 400);
        if (!(await allow("lookup-ip", hashIp(clientIp(req)), 60, 60))) return json({ error: "Too many requests" }, 429);

        const words = search.split(/\s+/).slice(0, MAX_WORDS);
        const found = await Address.find({
            $and: words.map((word) => ({ name: { $regex: escapeRegex(word), $options: "i" } })),
        })
            .select("name coordinates city")
            .limit(MAX_MATCHES)
            .lean();

        const matches = found
            .map((doc) => ({
                id: String(doc._id),
                title: String(doc.name ?? "").trim(),
                city: String(doc.city ?? "").trim(),
                lng: doc.coordinates?.[0],
                lat: doc.coordinates?.[1],
            }))
            .filter((m) => m.title && m.title !== "Unnamed" && Number.isFinite(m.lng) && Number.isFinite(m.lat));
        return json({ matches }, 200);
    } catch (error) {
        console.error(error);
        return json({ error: "Internal Server Error" }, 500);
    }
};
