import { NextResponse } from "next/server";
import ContactMessage from "../../../../models/contactMessageModel.js";
import { allow, clientIp, hashIp, sameOrigin } from "../../../../utils/rateLimit.js";

const json = (body, status) => NextResponse.json(body, { status });
const clean = (value, max) =>
    typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

// Plain e-mail through Resend's HTTP API (no dependency). Needs RESEND_API_KEY and CONTACT_TO_EMAIL (server-only);
// without them the message is only stored. Never throws: the message is already saved.
async function emailOwner({ name, replyTo, message, lang }) {
    const key = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL;
    if (!key || !to) return false;
    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                from: process.env.CONTACT_FROM_EMAIL || "Anzi <onboarding@resend.dev>",
                to: [to],
                ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo) ? { reply_to: replyTo } : {}),
                subject: "Anzi : nouveau message",
                text: `${message}\n\n--\nNom : ${name || "-"}\nRéponse : ${replyTo || "-"}\nLangue : ${lang}`,
            }),
            signal: AbortSignal.timeout(6000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

// POST /api/contact { name?, replyTo?, message, lang?, website? } : stores the message and e-mails it to the owner.
export const sendContact = async (req) => {
    try {
        if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
        if (!(await allow("contact-ip", hashIp(clientIp(req)), 5, 86400))) return json({ error: "Too many requests" }, 429);

        let body;
        try {
            body = await req.json();
        } catch {
            return json({ error: "Invalid body" }, 400);
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid body" }, 400);

        // Hidden field that only bots fill in: pretend it worked.
        if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true }, 201);

        const message = clean(body.message, 1000);
        if (message.length < 5) return json({ error: "Invalid input", fields: ["message"] }, 400);
        const entry = {
            name: clean(body.name, 60),
            replyTo: clean(body.replyTo, 120),
            message,
            lang: body.lang === "en" ? "en" : "fr",
        };

        const saved = await ContactMessage.create(entry);
        if (await emailOwner(entry)) await ContactMessage.updateOne({ _id: saved._id }, { $set: { emailed: true } });
        return json({ ok: true }, 201);
    } catch (error) {
        console.error(error);
        return json({ error: "Internal Server Error" }, 500);
    }
};
