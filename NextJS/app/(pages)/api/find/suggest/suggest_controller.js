import { NextResponse } from "next/server";
import Street from "../../../../../models/streetModel.js";
import { allow, clientIp, hashIp } from "../../../../../utils/rateLimit.js";
import { fold, nameKey } from "../../../../../utils/streetNames.js";
import { escapeRegex } from "../../../../../utils/validate.js";

const MAX_TEXT = 60;
const MIN_KEY = 2;
const MAX_SUGGESTIONS = 6;
const LEADING = new Set(["rue", "r", "av", "ave", "avenue", "bd", "boulevard", "blvd", "chemin", "ch", "allee", "impasse", "imp", "ruelle", "street", "st", "road", "rd", "lane", "close", "way", "drive", "de", "des", "du", "d", "la", "le", "les", "l", "the", "of"]);

// Letters of the typed text only, as street-name key prefixes: "rue des mangu" -> ["mangu"], "manguier bas" -> ["manguier", "manguierba"].
// The street name is the first one to three words; the rest of the box (number, quarter, city) is not completed here.
export function prefixKeys(raw) {
  const words = fold(raw.slice(0, MAX_TEXT)).replace(/[^a-z ]+/g, " ").split(" ").filter(Boolean);
  while (words.length > 0 && LEADING.has(words[0])) words.shift();
  words.splice(4);
  const keys = new Set();
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    const key = nameKey(words.slice(0, n).join(" "));
    if (key.length >= MIN_KEY) keys.add(key);
  }
  return [...keys];
}

// GET /api/find/suggest?q= : street names that start like the typed text, for the search box. Street names are
// already public (/api/streets); nothing about places or people is returned.
export const suggestStreets = async (req) => {
  try {
    const raw = req.nextUrl.searchParams.get("q");
    if (typeof raw !== "string") return NextResponse.json({ error: "Invalid search" }, { status: 400 });
    const keys = prefixKeys(raw);
    if (keys.length === 0) return NextResponse.json({ suggestions: [] }, { status: 200 });
    if (!(await allow("suggest-ip", hashIp(clientIp(req)), 120, 60))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const streets = await Street.find({
      status: "live",
      lineStatus: "ready",
      $or: keys.map((key) => ({ nameKey: { $regex: `^${escapeRegex(key)}` } })),
    }).limit(30);

    const seen = new Set();
    const suggestions = [];
    for (const street of streets) {
      if (!street.name) continue;
      const item = { name: street.name, lang: street.lang || "fr", quarter: street.quarter || "", city: street.city };
      const id = `${street.nameKey}|${item.quarter}|${item.city}`;
      if (seen.has(id)) continue;
      seen.add(id);
      suggestions.push(item);
    }
    suggestions.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ suggestions: suggestions.slice(0, MAX_SUGGESTIONS) }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
