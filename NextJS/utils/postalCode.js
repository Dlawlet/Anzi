import PostalCode from "../models/postalCodeModel.js";
import { fold } from "./streetNames.js";

// Key of a city or quarter name: lower case, no accents, trimmed, single spaces.
export const placeKey = (text) => fold(text ?? "").trim().replace(/\s+/g, " ");

export const POSTAL_CODE = /^\d{3,6}$/;

// Postal code a new street inherits: the (city, quarter) row, else the city-wide row. One query, "" when none.
// A lookup failure never blocks the creation of a street.
export async function inheritedPostalCode(city, quarter) {
  try {
    const quarterKey = placeKey(quarter);
    const rows = await PostalCode.find({ cityKey: placeKey(city), quarterKey: { $in: quarterKey ? [quarterKey, ""] : [""] } }).limit(2);
    const exact = rows.find((row) => row.quarterKey === quarterKey);
    return (exact || rows.find((row) => row.quarterKey === ""))?.postalCode || "";
  } catch (error) {
    console.error(error);
    return "";
  }
}
