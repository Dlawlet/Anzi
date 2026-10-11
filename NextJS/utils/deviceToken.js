import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const DEVICE_COOKIE = "anzi_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

function secret() {
  const value = process.env.DEVICE_TOKEN_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") throw new Error("DEVICE_TOKEN_SECRET is missing or shorter than 32 characters");
  return "dev-only-secret-dev-only-secret-0000";
}

const sign = (id) => createHmac("sha256", secret()).update(id).digest("base64url");

// Random device id plus its HMAC: the server can verify it without storing anything.
export function newDeviceToken() {
  const id = randomBytes(24).toString("base64url");
  return { id, token: `${id}.${sign(id)}` };
}

// Returns the device id when the cookie value is authentic, otherwise null.
export function verifyDeviceToken(token) {
  if (typeof token !== "string") return null;
  const [id, signature, ...rest] = token.split(".");
  if (!id || !signature || rest.length > 0) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

export const deviceCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DEVICE_COOKIE_MAX_AGE,
});
