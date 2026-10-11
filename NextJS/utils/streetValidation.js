import { isValidId } from "./validate.js";
import { validateStreetName } from "./streetNames.js";
import { validateLine } from "./streetNumbering.js";

export const LANGS = ["fr", "en"];

// The "street" part of a create-place request (docs/street-addressing.md section 8.2).
//   absent/null                          -> no street, code only
//   { streetId }                         -> join an existing street
//   { new: { name?, lang, line?, confirmNew? } } -> create a street (no name = unnamed, no line = waiting for the admin)
// Returns { errors, value }; errors holds "street" (shape) or "streetName".
export function validateStreetInput(raw) {
  if (raw == null) return { errors: [], value: null };
  if (typeof raw !== "object" || Array.isArray(raw)) return { errors: ["street"] };
  const keys = Object.keys(raw);
  if (keys.length !== 1) return { errors: ["street"] };

  if (keys[0] === "streetId") {
    return isValidId(raw.streetId) ? { errors: [], value: { kind: "join", streetId: raw.streetId } } : { errors: ["street"] };
  }
  if (keys[0] !== "new" || !raw.new || typeof raw.new !== "object" || Array.isArray(raw.new)) return { errors: ["street"] };

  const input = raw.new;
  if (Object.keys(input).some((key) => !["name", "lang", "line", "confirmNew"].includes(key))) return { errors: ["street"] };
  if (input.confirmNew != null && typeof input.confirmNew !== "boolean") return { errors: ["street"] };
  const value = { kind: "new", confirmNew: input.confirmNew === true, lang: "fr" };

  if (input.lang != null) {
    if (!LANGS.includes(input.lang)) return { errors: ["street"] };
    value.lang = input.lang;
  }
  if (input.name != null && input.name !== "") {
    const checked = validateStreetName(input.name);
    if (checked.error) return { errors: ["streetName"] };
    value.name = checked.name;
    value.nameKey = checked.key;
  }
  if (input.line != null) {
    const checked = validateLine(input.line, "trace");
    if (checked.error) return { errors: ["street"] };
    value.line = checked.line;
    value.lengthM = checked.lengthM;
  }
  return { errors: [], value };
}
