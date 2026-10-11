import { createHash } from "node:crypto";
import RateLimit from "../models/rateLimitModel.js";

// Fixed-window counter in MongoDB (free, no extra service). True while under the limit.
export async function allow(scope, id, limit, windowSeconds) {
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const doc = await RateLimit.findOneAndUpdate(
    { key: `${scope}:${id}:${bucket}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs + 60000) } },
    { upsert: true, returnDocument: "after" }
  );
  return doc.count <= limit;
}

export function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip")) || "unknown";
}

// Store a hash, not the address itself.
export const hashIp = (ip) => createHash("sha256").update(`anzi-ip:${ip}`).digest("hex").slice(0, 32);

// Reject cross-site writes: browsers send Origin on POST/PATCH/DELETE.
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
