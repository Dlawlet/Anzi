// Client-safe code parsing (no node:crypto), shared by the API and the find screen.
// No 0/O, 1/I/L: readable over the phone and in WhatsApp.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Accepts user input such as "yde 7k4m" or "YDE-7K4M"; null when it cannot be a code.
export function normalizeCode(input) {
  if (typeof input !== "string") return null;
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, "");
  const match = /^([A-Z]{3})([A-Z0-9]{4})$/.exec(compact);
  if (!match) return null;
  return [...match[2]].every((c) => CODE_ALPHABET.includes(c)) ? `${match[1]}-${match[2]}` : null;
}
