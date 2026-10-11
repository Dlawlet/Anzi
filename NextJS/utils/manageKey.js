import { createHash, randomInt } from "node:crypto";
import { CODE_ALPHABET } from "./codeFormat.js";

// Management key: shown once when an address is created. It is what lets the owner get the address back on another
// phone or browser (there are no accounts). 12 characters from the readable alphabet (about 61 bits), written
// "K7QM-4TXP-9RWD". Only a hash is stored; the key never appears in a public response or a log.
const KEY_LENGTH = 12;

export function generateManageKey() {
  let key = "";
  for (let i = 0; i < KEY_LENGTH; i++) key += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return key;
}

export const formatManageKey = (key) => key.match(/.{4}/g).join("-");

// Accepts "k7qm 4txp 9rwd", "K7QM-4TXP-9RWD" or the compact form; null when it cannot be a key.
export function normalizeManageKey(input) {
  if (typeof input !== "string" || input.length > 40) return null;
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, "");
  return compact.length === KEY_LENGTH && [...compact].every((c) => CODE_ALPHABET.includes(c)) ? compact : null;
}

export const hashManageKey = (key) => createHash("sha256").update(`anzi-manage:${key}`).digest("hex");
