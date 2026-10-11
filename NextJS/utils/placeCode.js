import { randomInt } from "node:crypto";
import { CODE_ALPHABET, normalizeCode } from "./codeFormat.js";

export const CODE_LENGTH = 4;
export { CODE_ALPHABET, normalizeCode };

// City prefix scheme is an open owner decision (plan section 1); unknown cities use CMR.
const PREFIXES = { yaounde: "YDE", yaoundé: "YDE", douala: "DLA", bafoussam: "BFM", garoua: "GOU", bamenda: "BDA" };

export function cityPrefix(city) {
  const key = String(city || "").trim().toLowerCase();
  return PREFIXES[key] || "CMR";
}

export function generateCode(city) {
  let suffix = "";
  for (let i = 0; i < CODE_LENGTH; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${cityPrefix(city)}-${suffix}`;
}
