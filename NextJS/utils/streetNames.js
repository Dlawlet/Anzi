// Street names (docs/street-addressing.md section 3): keys, sound-alike check and the filter for names users write.
// The noun pool and the 3-suggestion picker arrive with the create flow.
export const SOUND_ALIKE_DISTANCE = 1;
export const NAME_RADIUS_M = 2000; // two streets within 2 km never share a name

const TYPE_WORDS = new Set([
  "rue", "avenue", "av", "ave", "boulevard", "bd", "blvd", "chemin", "allee", "impasse", "ruelle", "route",
  "street", "st", "road", "rd", "lane", "close", "way", "drive",
]);

// Landmark, office and city words that must not be a street name; starter lists to be reviewed by local readers.
const RESERVED = new Set([
  "pharmacie", "ecole", "eglise", "mosquee", "marche", "gare", "carrefour", "pont", "stade", "hopital", "mairie",
  "school", "church", "market", "bridge", "hospital", "station", "pharmacy",
  "maire", "prefet", "ministre", "president", "chef", "lamido", "fon", "roi", "sultan", "mayor", "minister", "chief",
  "officiel", "official", "anzi", "rdpc", "cpdm", "sdf", "undp", "mrc", "biya",
  "yaounde", "douala", "bafoussam", "garoua", "bamenda", "bertoua", "buea", "limbe", "kribi", "maroua", "ngaoundere", "ebolowa",
]);
const BLOCKED = [
  "merde", "connard", "connasse", "putain", "salope", "encule", "couille",
  "fuck", "shit", "bitch", "pussy", "asshole", "bastard", "whore", "idiot", "imbecile", "stupide", "stupid",
];
const BLOCKED_WHOLE = new Set(["con", "cul", "sex", "sexe", "nul", "bite", "pute", "fdp", "nique", "dick"]); // short: only as a whole word

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

export const fold = (text) => String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const collapseRepeats = (text) => text.replace(/(.)\1+/g, "$1");
const RESERVED_FLAT = new Set([...RESERVED].map(collapseRepeats)); // compared after repeated letters are collapsed

// Stable comparison key: accents, case, spaces, type word and plural endings removed ("Rue des Manguiers" ~ "manguier").
export function nameKey(name) {
  const words = fold(name).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(Boolean);
  while (words.length > 1 && (TYPE_WORDS.has(words[0]) || ["de", "des", "du", "la", "le", "les", "d", "l"].includes(words[0]))) words.shift();
  while (words.length > 1 && TYPE_WORDS.has(words[words.length - 1])) words.pop();
  let key = words.join("");
  if (key.length > 4 && /[sx]$/.test(key)) key = key.slice(0, -1);
  return key;
}

// French-leaning phonetic key: words that sound alike share a key or differ by one letter.
export function phoneticKey(name) {
  let key = nameKey(name);
  key = key
    .replace(/ph/g, "f").replace(/qu/g, "k").replace(/gu(?=[ei])/g, "g")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/g(?=[eiy])/g, "j")
    .replace(/eau|au/g, "o").replace(/ain|ein/g, "I").replace(/ai|ei/g, "e").replace(/ou/g, "u")
    .replace(/an|en|am|em/g, "A").replace(/on|om/g, "O").replace(/in|un|im/g, "I")
    .replace(/y/g, "i").replace(/h/g, "");
  return collapseRepeats(key).replace(/[estxd]$/, "");
}

// True when the edit distance is at most 1 (substitution, insertion or deletion).
export function withinOne(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// Is this name the same as, or sounds like, one of the names already used nearby?
export function clashesWith(name, usedNames) {
  const key = nameKey(name);
  const sound = phoneticKey(name);
  return usedNames.some((used) => nameKey(used) === key || withinOne(phoneticKey(used), sound));
}

const LETTER = /^[A-Za-zÀ-ÖØ-öø-ÿŒœ'’ -]+$/;

// Validates a name typed by a user. Returns { name, key } or { error: "name" } (no hint on which rule failed).
export function validateStreetName(text) {
  if (typeof text !== "string") return { error: "name" };
  const cleaned = text.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || cleaned.length > 24 || !LETTER.test(cleaned)) return { error: "name" };

  let words = cleaned.split(" ");
  while (words.length > 0 && TYPE_WORDS.has(fold(words[0]))) words = words.slice(1);
  while (words.length > 1 && TYPE_WORDS.has(fold(words[words.length - 1]))) words = words.slice(0, -1);
  if (words.length === 0 || words.length > 3 || words.some((w) => w.length > 14 || w.length < 2)) return { error: "name" };
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const folded = fold(name);
  const unleet = folded.replace(/[0134578@$]/g, (c) => LEET[c] ?? c);
  const tokens = unleet.replace(/[^a-z ]+/g, " ").split(" ").filter(Boolean).map(collapseRepeats);
  const squashed = tokens.join("");
  if (tokens.some((t) => RESERVED_FLAT.has(t) || BLOCKED_WHOLE.has(t))) return { error: "name" };
  if (RESERVED_FLAT.has(squashed)) return { error: "name" };
  if (BLOCKED.some((bad) => squashed.includes(collapseRepeats(bad)))) return { error: "name" };

  const key = nameKey(name);
  if (key.length < 2) return { error: "name" };
  return { name, key };
}
