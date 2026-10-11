import { randomInt } from "node:crypto";

// No 0/O, 1/I/L: readable over the phone and in WhatsApp.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

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

// Accepts user input such as "yde 7k4m" or "YDE-7K4M"; null when it cannot be a code.
export function normalizeCode(input) {
  if (typeof input !== "string") return null;
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, "");
  const match = /^([A-Z]{3})([A-Z0-9]{4})$/.exec(compact);
  if (!match) return null;
  return [...match[2]].every((c) => CODE_ALPHABET.includes(c)) ? `${match[1]}-${match[2]}` : null;
}
