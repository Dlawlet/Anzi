import { normalizeCode } from "./codeFormat.js";

// Parser of the one search box (docs/street-addressing.md section 5). Pure and client-safe.
// "Manguier 12", "12 rue manguier bastos", "n°12 av. des manguiers", "yde 7k4m" or a plain word.
const MAX_LENGTH = 60;
const MAX_NAME_WORDS = 3;
const SUFFIX_RE = /^[a-hjkmnp-z]$/; // no I, L, O: same letters as the labels
const NUMBER_WORDS = new Set(["n", "no", "num", "numero", "number", "nr"]);
const TYPE_WORDS = new Set([
  "rue", "r", "av", "ave", "avenue", "bd", "boulevard", "blvd", "chemin", "ch", "allee", "impasse", "imp", "ruelle",
  "street", "st", "road", "rd", "lane", "ln", "close", "way", "drive",
]);
const FILLER_WORDS = new Set(["de", "des", "du", "d", "la", "le", "les", "l", "the", "of"]);

const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Folded tokens: separators become spaces (a dot between digits stays), "manguier12" splits, "12b" stays whole.
function tokens(text) {
  const spaced = fold(text)
    .replace(/(\d)\.(?=\d)/g, "$1\u0000") // keep "1.750"
    .replace(/[^a-z0-9\u0000]+/g, " ")
    .replace(/\u0000/g, ".");
  const out = [];
  for (const word of spaced.split(" ").filter(Boolean)) {
    if (/^\d{1,4}[a-z]$/.test(word)) out.push(word);
    else out.push(...word.split(/(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/));
  }
  return out;
}

// -> { type: "code", code } | { type: "address", words, number, suffix } | { type: "words", text } | { type: "invalid" }
export function parseQuery(raw) {
  if (typeof raw !== "string") return { type: "invalid" };
  const text = raw.trim().slice(0, MAX_LENGTH);
  if (!text) return { type: "invalid" };

  const code = normalizeCode(text);
  if (code) return { type: "code", code };

  const kept = tokens(text).filter((t) => !NUMBER_WORDS.has(t) && !TYPE_WORDS.has(t) && !FILLER_WORDS.has(t));
  const numeric = kept.filter((t) => /^\d{1,4}[a-z]?$/.test(t));
  const words = kept.filter((t) => !numeric.includes(t));
  if (numeric.length !== 1 || words.length === 0) return { type: "words", text };

  const [, digits, ownSuffix] = /^(\d{1,4})([a-z]?)$/.exec(numeric[0]);
  const number = Number(digits);
  if (number < 2) return { type: "words", text };
  let suffix = ownSuffix;
  // "12 B Manguier": a lone letter right after the number is the suffix, as long as a name word is left.
  const next = kept[kept.indexOf(numeric[0]) + 1];
  if (!suffix && next && SUFFIX_RE.test(next) && words.length > 1) {
    suffix = next;
    words.splice(words.indexOf(next), 1);
  }
  if (suffix && !SUFFIX_RE.test(suffix)) return { type: "words", text };
  return { type: "address", words: words.slice(0, 6), number, suffix: suffix.toUpperCase() };
}

// Contiguous slices of the typed words that may be the street name; the other words are the quarter or city.
// Longest names first, then the earliest.
export function nameWindows(words) {
  const windows = [];
  for (let size = Math.min(MAX_NAME_WORDS, words.length); size >= 1; size--) {
    for (let from = 0; from + size <= words.length; from++) {
      windows.push({ name: words.slice(from, from + size), place: [...words.slice(0, from), ...words.slice(from + size)] });
    }
  }
  return windows;
}
