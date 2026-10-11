# Street addressing core (streets, house numbers, names, lookup)

Status: design proposal, 2026-10-11. Owner decisions taken as final: the visible address is **street word + house number** ("Manguier 12", "12 Rue Manguier, Bastos, Yaoundé"); the number is **automatic from the position along the street** (consecutive for neighbours, odd/even sides); the first person on an unnamed street taps one of **3 suggested nouns** or writes one; the name is a **provisional community name** until about 3 neighbours confirm; never official; an official commune name can override; old names keep working. The Anzi code (`YDE-7K4M`) stays as the hidden permanent ID and the "code de secours".

This document owns the street data model, the numbering algorithm, the naming rules and the API (`docs/design-2026-10.md` defers to it). Items marked **[decide]** are owner calls (section 10), **[validate]** could not be checked here. It changes a public interface (`/api/places`); breaking changes are listed in section 8.

Evidence: a scratch simulation (outside the repo, results in 1.3) of 4 numbering schemes on straight, curved and S-shaped streets, 30 % and 80 % of houses registered in random order, GPS error 3 to 30 m.

## Owner answers to section 10 (2026-10-11): these override the text below where they differ

1. **Numbering:** the first house on a street is not automatically n°1. Numbers follow the reading order of the houses along the street line (increasing along the line). Automate this wherever a line exists. Where no line exists, the admin (owner) traces the line when a user requests the street at creation. No guessing from GPS.
2. **Privacy (Google-style):** typing a street and number shows the location and offers directions, never anything about the person living there. Homes show only street, number, quarter/city and landmark; the home's name and owner details are never shown to others. Only businesses (public places) show their name and information. Link-only/private homes still return only the spot, identical for unknown addresses (the anti-enumeration rule in the section 6 proposal stands).
3. **OpenStreetMap:** keep using OSM (free, already the base of the map data). Bulk import of OSM street lines is deferred; admin traces lines first. Focus on shipping the app quickly.
4. **Street names:** unique within 2 km, stored in the language the user wrote, never translated. Type words (rue, avenue, street...) are translated in the UI; the name itself is not.
5. **Naming authority:** the admin fixes street names (final judge, moderation only). Bonus rule: when a user's street reaches at least 5 houses, the name that user proposed is accepted automatically; otherwise the admin decides. The "3 confirming neighbours" rule is dropped.
6. **ADMIN_TOKEN:** approved as a new server-only secret.

Stability note: reading-order numbering conflicts with "a number never changes" when a house is inserted between two existing ones. Keep the section 1 rule (a busy spot takes a letter, 100A; numbers are never reused) unless the owner decides otherwise.

---

## 1. Numbering algorithm

### 1.1 Constraints (restated)
1. An issued number never changes and never points to another place (it is in WhatsApp messages and on gates).
2. Neighbours get close numbers; odd on one side, even on the other.
3. Houses join in any order, on both sides of the first house.
4. Works on curved streets and long streets.
5. Phone GPS error is 5 to 30 m; houses on opposite sides are only 15 to 30 m apart; neighbours are 10 to 20 m apart.
6. Same-spot places, corner houses, set-back houses, wrong street choice.
7. Explainable in one plain sentence.

### 1.2 Candidate schemes

| | Scheme | How | Failure modes |
|---|---|---|---|
| A | **Order with gaps** | First house 100; next one past the end gets +10, before the start -10; a house between 100 and 110 gets 105, and so on. | Numbers say nothing about distance. As the street fills, the gaps run out and letters appear: **12-52 % of houses needed a suffix** in the simulation (about 50 % at 80 % registration). Order relies on GPS anyway. Rejected. |
| B | **Metric along an axis guessed from the houses** (straight axis frozen from the first two houses, or a line fitted to members, extended as houses arrive) | Number = distance along that axis. | One GPS point gives no direction; two noisy points 30-60 m apart give a direction off by 20-40°. **Side (odd/even) was wrong for 15-40 % of houses, mostly 25-40 %** (close to a coin toss: the line passes through the houses, not between the rows). Far houses drift off the guessed axis: **6-35 % of later houses could not attach** to their own street (up to 65 % when joining requires being near an existing member), so one road splits into several Anzi streets. Rejected as the primary path. |
| C | **Metric along a real street line** (centreline from OpenStreetMap, from a 2-tap trace by the first user, or drawn by the moderator), frozen once used | Number = 2 × slot index along the line + side bit, slots of 10 m, collisions resolved locally. | Needs a line before the first number. GPS error still swaps close neighbours and flips sides when the pin is not adjusted (numbers in 1.3). **Recommended.** |

### 1.3 Simulation results for scheme C (300 runs per row, 10 m slots)

| GPS error of the pin | Wrong side (odd/even) | Same-side neighbours in wrong order (30 % / 80 % registered) | Needs a letter suffix (30 % / 80 %) |
|---|---|---|---|
| 3-6 m (pin moved onto the roof on the mini-map) | 0.2 % | 0.2 % / 0.6 % | 0 % / 0.2 % |
| 5-10 m | 2 % | 1 % / 3 % | 0.1 % / 1 % |
| 10-20 m | 12 % | 6 % / 13 % | 1 % / 4 % |
| 20-30 m | 23 % | 11 % / 23 % | 1 % / 7 % |

- Median gap between two registered same-side neighbours: 8 at 30 % registration, 4 at 80 % (100, 104, 108...). Numbers become consecutive (100, 102) only when every house is registered.
- Slot size: 6, 8, 10 and 12 m give the same error rates; smaller slots make bigger numbers (a 600 m street ends at 221 with 6 m, 133 with 10 m, 113 with 12 m), 12 m doubles suffixes in dense rows. **10 m** is the compromise.
- Curved (half-circle) street: same rates as straight; arclength along the line handles curves.
- A line attached late to a street numbered from a guessed axis can be re-aligned to the existing numbers (median residual 0.3-0.8 slot), so scheme B numbers are not lost if they ever exist; their sides stay wrong.

**Conclusion:** the pin accuracy, not the formula, decides quality. Below 10 m the scheme meets the owner's goals; at 20-30 m one house in four gets the wrong side. So the create flow must ask the user to drag the pin onto their roof (the mini-map of step 3 already exists in the design) before the number is computed.

### 1.4 Recommended scheme: "10-metre slots along the street line"

Plain sentence (FR / EN), shown under "Votre numéro":
> « Les numéros montent de 2 tous les 10 mètres le long de la rue : pairs d'un côté, impairs de l'autre. »
> "Numbers go up by 2 every 10 metres along the street: even on one side, odd on the other."

Definitions (all distances in metres, local equirectangular projection around the street's first vertex; error < 0.1 % over 5 km at Cameroon latitudes):

```
SLOT_M        = 10        // one slot = 10 m of street
BASE_FULL     = 5         // line covers the whole street from its start (OSM, moderator): first numbers 10/11
BASE_PARTIAL  = 50        // line is a local trace by a user: numbers near 100, room for 500 m behind the start
MAX_LATERAL_M = 60        // farther from the line than this = not on this street
MAX_BEYOND_M  = 120       // past either end of the line by more than this = needs the line extended
MIN_NUMBER    = 2
MAX_NUMBER    = 9999
SUFFIXES      = "ABCDEFGHJKMNPQRSTUVWXYZ"   // no I, L, O
```

Street fields used: `line` (frozen polyline, direction = numbering direction), `originS` (arclength of slot 0 relative to the line's first vertex, changes only when the line is extended backwards), `baseSlot` (5 or 50), `evenSide` ("right" by default: French convention, even on the right when walking from the start).

```
function idealNumber(street, point):
  (s, d) = project(street.line, point)        // s: arclength from first vertex, extended straight past both ends
                                               // d: signed distance, left of travel > 0
  if |d| > MAX_LATERAL_M                        -> error "too_far_from_street"
  if s < -MAX_BEYOND_M or s > length + MAX_BEYOND_M -> error "past_street_end"
  x    = (s - street.originS) / SLOT_M
  slot = street.baseSlot + round(x)              // round = Math.round (halves go up)
  side = (d < 0) ? "right" : "left"
  bit  = (side == street.evenSide) ? 0 : 1
  n    = 2 * slot + bit
  if n < MIN_NUMBER or n > MAX_NUMBER           -> error "past_street_end"
  return { n, frac: x - round(x), alongM: s - originS, offsetM: d }

function candidates(ideal):                     // tried in order, first free label wins
  yield (n, "")
  yield (n + 2 * sign(frac or +1), "")          // the neighbouring slot on the same side, toward the true position
  for c in SUFFIXES: yield (n, c)               // 100A, 100B ...
```

Allocation inserts an `AddressLabel` row `{streetId, houseNumber, houseSuffix}` under a unique index; a duplicate-key error moves to the next candidate (same pattern as `generateCode` retries today). Labels are never deleted: deleting a place retires its label, moving it marks it "moved". So a label once issued can never be given to another place.

Freezing rules:
- A line is frozen as soon as one number has been issued on it. Its interior vertices never change.
- It may be **extended** at either end (moderator, OSM import, or a user trace that starts on the current end). Appending changes nothing; prepending a segment of length `L` does `originS += L`, so every existing number keeps its position.
- Numbers are computed once, at creation, from the pin the user confirmed. Editing the pin later does not change the number (only an owner "move", section 2.6, does, with a redirect).

Where the line comes from (line-first, **[decide] 1**):
1. **OSM seed** (pilot area imported once, section 2.2): the line exists before anyone registers; zero effort for users.
2. **2-tap trace** by the first user when no line is within reach: on the step-3 mini-map, "Touchez la rue à gauche de votre entrée, puis à droite." The two taps (or up to 8 for a bend) become the line. If one end of the trace is within 30 m of another street's line, that end is the start ("Les numéros montent depuis la rue {x}", as in the design) and `baseSlot = 5`; otherwise the first tap is the start and `baseSlot = 50` (numbers near 100, room for 500 m behind).
3. **Moderator**: if the user skips the trace or the map cannot load, the street is created with only an anchor point; the place gets its street name and code at once and `numberStatus: "waiting"`. When the moderator draws the line (desktop, same map), waiting places are numbered in creation order. No number was ever shown before, so rule 1.1.1 holds. The success screen says "Votre numéro arrive bientôt" and My addresses shows it when ready.

No number is ever guessed from GPS points alone (scheme B): the simulation shows it gives wrong sides and split streets.

### 1.5 Where it cannot be both consecutive and stable
- Metric numbering **reserves numbers for houses not registered yet**, so registered neighbours have gaps (100, 108) until the street fills up. That is the price of never renumbering; order-with-gaps (scheme A) gives tighter numbers at first and then letters on half the houses.
- GPS error can **swap two close neighbours** or **put a house on the wrong side**. A frozen number cannot be fixed later. Mitigation before issuing: pin nudge on the mini-map; if the reported accuracy is worse than 20 m and the pin was not moved, show the number box with "Vérifiez que l'épingle est sur votre toit" before the final step. After issuing: nothing changes automatically; the owner may "move" the place (new label, old one redirects), which is rare and explicit.
- A collision takes the neighbouring slot if it is free (within one slot of the truth), else a letter (100A). Letters were 0-7 % in the simulation.

### 1.6 Edge cases

| Case | Expected result |
|---|---|
| First house on an OSM street, 230 m from the start, right side | 2 × (5 + 23) + 0 = **56** |
| First house on an untraced, unmapped street, user taps 2 points around the gate | about **100-104** (start = first tap, 500 m of room behind it); if the trace starts at another street, about **10 + 2 per 10 m** from that junction |
| First house, user skips the trace (or no WebGL) | street created with an anchor point; code and street name now; number **waiting** until the moderator draws the line |
| Second house straight across the street from 100 | **101** |
| House 25 m behind the start of a traced line | 2 × (50 - 2) + bit = **96/97** |
| Traced line 40 m long, house 80 m past its end | extrapolated along the last segment: x = 12, **124/125**; the line is not changed |
| House 130 m past the end | 409 `past_street_end`: "draw where the street continues" (2 taps) or skip (number waiting) |
| Curved street | arclength along the polyline; numbers follow the bend |
| Inside of a sharp bend (two segments equally close) | the nearest segment wins; numbers may jump by one slot there; stable |
| Two places in one compound or a shop inside a home | the second gets the free neighbouring slot (102) if the true position is within that slot, else **100A** |
| Corner house | the user picks the street of the entrance; numbered on that street only |
| House set back 30-60 m behind another house | numbered by projection; side by the sign of the offset |
| Set back more than 60 m (on a private path) | 409 `too_far_from_street`: this path is its own street |
| GPS accuracy 25 m, pin not moved | number issued with a warning before submit; may be 2-3 slots off or on the wrong side (23 % in simulation) |
| Wrong street chosen | geometry checks reject most cases (60 m lateral, 120 m past ends); otherwise the owner moves the place: new label, old label redirects |
| Place deleted | label retired, never reissued |
| Street longer than 3 km (OSM) | split at the junction nearest the middle at import; numbers stay below about 610 |
| Number would be below 2 | treated as `past_street_end` |
| Street renamed / official name set | number unchanged; old name keeps working |
| Commune plates appear with other numbers | Anzi number unchanged; owner can add the plate as `officialNumber`, shown first on the card |

---

## 2. Street geometry and assignment

### 2.1 Representation
- `geometry`: one GeoJSON field with a `2dsphere` index. **LineString** once the street has a line (2 to 200 vertices, `[lng, lat]`); **Point** (the anchor = first place) while it waits for a line. One field keeps a single `$nearSphere` query for both.
- `originS`, `baseSlot`, `evenSide`, `lengthM`, `lineSource` (`osm` | `trace` | `moderator`), `lineStatus` (`ready` | `waiting`).
- No stored list of member points: members are the places with this `streetId` (indexed). Centroid and bearing are not needed once the line exists.
- Extent = the line plus `MAX_BEYOND_M` (120 m) at each end, `MAX_LATERAL_M` (60 m) each side.
- Caps: `lengthM` <= 3,000 (OSM ways are split at import; a user trace is limited to 400 m and 8 taps, consecutive taps 5-400 m apart); `placeCount` soft cap 1,000 (above that, new joins go to the moderator queue). Beyond the extent a house is offered "draw where the street continues" (extends the line) or a new street.

### 2.2 OSM seed (recommended for the pilot area, **[decide] 3**)
One-off script (`scripts/import-osm-streets.mjs`, run by the owner, not at runtime): an Overpass extract of `highway=*` roads usable by people (residential, unclassified, tertiary, living_street, service, track, path, footway, pedestrian) for the pilot bounding box, saved as GeoJSON, then:
- merge ways that share an end and the same `name` (or are both unnamed with an angle under 30° at the junction); split at junctions so no line exceeds 3 km;
- origin = the end nearer the city centre (centre coordinates added next to `CITIES`), `baseSlot = 5`, `evenSide = "right"`;
- an OSM `name` becomes the street name with `nameSource: "osm"` and `nameStatus: "accepted"` (users cannot propose over it; a moderator can); unnamed ways become `nameStatus: "unnamed"` (the grey dashed "Sans nom" lines of the design);
- never re-import over a street that has numbers: later imports only add streets or extend lines at their ends.
OSM data is ODbL: show "© OpenStreetMap contributors" wherever lines or OSM names appear (the `/about` credits and map attribution); whether storing derived lines makes Anzi's street table a "derivative database" with share-alike duties is **[validate]**.

### 2.3 Nearby streets for a new place
`Street.find({ status: "live", geometry: { $nearSphere: { $geometry: point, $maxDistance: 150 } } }).limit(8)` returns lines sorted by distance (the distance to a LineString is to its nearest point **[validate] on Atlas M0**; fallback: also store the vertices as a `MultiPoint` and query that). The controller then projects the pin on each line and keeps the streets where the pin is inside the extent, ranks them by lateral distance, and returns at most 5, plus the **ideal** number and side for each (so the step-3 number box can show it as soon as a row is tapped). The preview never checks which labels are taken: that would tell anyone which numbers are registered. The final number (possibly the neighbouring slot or a letter) comes back with the 201 of the create request, before anything is shared. The small remaining signal (getting 14 instead of 12) costs a real place created within 60 m of the line under the create limits. Waiting streets (Point) are ranked by distance to the anchor.

### 2.4 When a new street is created
- The user taps "Nouvelle rue — Ma rue n'est pas dans la liste", or no street is within reach.
- If a ready street has the pin inside its extent with a lateral distance under 25 m, the API answers 409 `street_exists_nearby` with that street; the UI asks "Votre entrée donne-t-elle sur la rue {x} ?" and only a second, explicit `confirmNew: true` creates the new street. This is the main guard against duplicate streets.
- A new street's trace must pass within 60 m of the pin, and its first segment must not run within 20 m of, and parallel to (angle under 20°), an existing line (409 `street_exists_nearby`).
- Quarter and city of a new street are copied from the creating place (editable by the moderator); later places get them prefilled from the street (design step 4).

### 2.5 Protections against the wrong street
1. Geometry: lateral <= 60 m and inside the extent, or the API refuses (409 with a reason code).
2. Nearest-first list; if the picked street is more than 25 m farther than the nearest one, the UI shows "La rue {nearest} est plus près. Votre entrée donne bien sur {picked} ?".
3. The number box shows the side and the number before the final step, on the mini-map with milestone tags (section 6.4), so a wrong guess is visible.
4. Corner houses: the instruction is "la rue devant votre entrée".
5. After the fact: the owner moves the place (2.6); the moderator can move a place too (report "mauvaise rue").

### 2.6 Moving a place to another street
`PATCH /api/places/[code]` with `{ street: {...} }`: allocates a new label on the target street, marks the old label `moved` with `movedTo` = the place, decrements/increments `placeCount`. Lookups of the old label answer like a renamed street: "Cette adresse est maintenant {new}" (subject to the privacy rule of section 6). Limit: 3 moves per place, rate limit `move-device` 3/day.

## 3. Street name noun pool

### 3.1 Design
- A constant in `NextJS/utils/streetNames.js` (no dependency, client-safe so the picker can render tiles offline). Each entry: `{ id, fr, en, group, tier }`. `id` is a stable slug (`manguier`), never shown.
- **Tier 1** = the three tile groups of the approved design: `fruit` ("arbre fruitier", fruit icon), `tree` ("grand arbre", tree icon), `bird` ("oiseau", bird icon). **Tier 2** (used when tier 1 is exhausted nearby): flowers, small animals, objects, sky, stones. Tier 2 needs one generic icon (e.g. `leaf`) or four small new ones; design's call.
- Word rules: one word (two at most for EN, "Flame Tree"), 3-12 letters, no digits, said the same way by most speakers, spelled the way it sounds as far as French allows. Positive or neutral. Not a first name in common use, a brand, a quarter or city name, a landmark word, or a near-homophone of another entry.
- Excluded on purpose (examples, to guide the review): animals used as insults (âne, cochon, singe, gorille, chien, rat, vache, chèvre, mouton, poule, dinde, pintade, oie, pie, chacal, hyène, crapaud, cafard); bad-omen or sorcery animals (hibou, chouette, chauve-souris, corbeau, vautour, caméléon, serpent, araignée); royal, chiefdom or national-team symbols (lion, léopard, panthère, éléphant, buffle); possible party emblems (flambeau/torche, crabe **[validate]**); slang traps (carotte as in "carotter" (to cheat), gombo (side job, bribe), martinet (a whip), grue); homophones (pin/pain, mil/mille, sel/selle, ancre/encre, datte/date, chêne/chaîne, saule/sol, champ/chant, puits/puis, phare/fard, vert/verre/ver, coq/coque, paon, poisson/poison); landmark and infrastructure words that point to something that may not be there (pont, rivière, colline, gare, marché, école, église, mosquée, pharmacie, carrefour, moulin, fontaine); brands (Orange, Ibis); first names (Rose, Marguerite, Violette, Olivier, Aurore, Jade, Ambre); colours alone and numbers ("Rue Sept 12" is unreadable).
- **[validate]** the whole list with 3-5 local readers (francophone and anglophone, different regions) before launch: party symbols, slang, totems, first names. The list below is a starter, not final.

### 3.2 Starter list (138 entries, FR / EN)

Tier 1, `fruit` (arbre fruitier and fruits, 35): Manguier / Mango · Safoutier / Safou · Goyavier / Guava · Avocatier / Avocado · Papayer / Pawpaw · Citronnier / Lemon · Cocotier / Coconut · Bananier / Banana · Palmier / Palm · Figuier / Fig · Tamarinier / Tamarind · Cacaoyer / Cocoa · Karité / Shea · Ananas / Pineapple · Corossol / Soursop · Pastèque / Watermelon · Melon / Melon · Cerise / Cherry · Fraise / Strawberry · Raisin / Grape · Pomme / Apple · Arachide / Groundnut · Manioc / Cassava · Plantain / Plantain · Macabo / Cocoyam · Maïs / Corn · Piment / Pepper · Vanille / Vanilla · Cannelle / Cinnamon · Sésame / Sesame · Miel / Honey · Citrouille / Pumpkin · Tomate / Tomato · Haricot / Bean · Gingembre / Ginger

Tier 1, `tree` (grands arbres et fleurs d'arbres, 23): Baobab / Baobab · Acajou / Mahogany · Kapokier / Kapok · Flamboyant / Flame Tree · Acacia / Acacia · Bambou / Bamboo · Raphia / Raffia · Jacaranda / Jacaranda · Mimosa / Mimosa · Magnolia / Magnolia · Tournesol / Sunflower · Hibiscus / Hibiscus · Lotus / Lotus · Lavande / Lavender · Lilas / Lilac · Camélia / Camellia · Iris / Iris · Tulipe / Tulip · Azalée / Azalea · Gardénia / Gardenia · Orchidée / Orchid · Jasmin / Jasmine · Pétale / Petal

Tier 1, `bird` (20): Colibri / Hummingbird · Calao / Hornbill · Touraco / Turaco · Tisserin / Weaver · Perroquet / Parrot · Héron / Heron · Aigrette / Egret · Aigle / Eagle · Faucon / Falcon · Pélican / Pelican · Canari / Canary · Moineau / Sparrow · Hirondelle / Swallow · Merle / Blackbird · Rossignol / Nightingale · Perdrix / Partridge · Caille / Quail · Toucan / Toucan · Cigogne / Stork · Pinson / Finch

Tier 2, `animal` (15): Papillon / Butterfly · Abeille / Honeybee · Libellule / Dragonfly · Coccinelle / Ladybird · Gazelle / Gazelle · Antilope / Antelope · Girafe / Giraffe · Zèbre / Zebra · Tortue / Tortoise · Hérisson / Hedgehog · Cheval / Horse · Hippocampe / Seahorse · Grillon / Cricket · Cigale / Cicada · Lamantin / Manatee

Tier 2, `object` (27): Calebasse / Calabash · Panier / Basket · Tambour / Drum · Balafon / Balafon · Natte / Mat · Lanterne / Lantern · Bougie / Candle · Boussole / Compass · Plume / Feather · Miroir / Mirror · Ballon / Ball · Pirogue / Canoe · Hamac / Hammock · Pilon / Pestle · Sifflet / Whistle · Guitare / Guitar · Flûte / Flute · Horloge / Clock · Ruche / Beehive · Verger / Orchard · Jardin / Garden · Vélo / Bicycle · Crayon / Pencil · Chapeau / Hat · Parapluie / Umbrella · Échelle / Ladder · Brouette / Wheelbarrow

Tier 2, `sky` (8): Soleil / Sun · Lune / Moon · Étoile / Star · Nuage / Cloud · Comète / Comet · Planète / Planet · Horizon / Horizon · Brise / Breeze

Tier 2, `stone` (10): Perle / Pearl · Corail / Coral · Cristal / Crystal · Saphir / Sapphire · Émeraude / Emerald · Rubis / Ruby · Opale / Opal · Topaze / Topaz · Turquoise / Turquoise · Quartz / Quartz

### 3.3 Language (FR default, EN toggle)
- Suggestions come in the UI language; the design's small FR | EN toggle on the tiles switches the word language only. Default EN when the UI is English or the region is Nord-Ouest or Sud-Ouest.
- The chosen word is stored **once, in its language**, with `poolId`. It is never translated automatically: two names for one street would break addresses said over the phone. Lookup accepts the twin ("Mango 12" finds "Manguier 12", `match: "twin"`).
- Street type word (recommended; the design leaves it open): it follows the **name's** language, not the reader's. A French name reads "Rue Manguier" in both UIs; an English name reads "Mango Street" in both. The short form "Manguier 12" has no type word and is the one to promote.

### 3.4 Uniqueness scope (**[decide] 4**)
- **Hard rule: no two streets within 2 km share a name key**, counting current names, aliases (old names) and pool twins. Quarter names are typed by hand today ("Bastos", "bastos", "Quartier Bastos"), so a geometric rule is more reliable than "per quarter".
- **Suggestion preference:** words unused in the whole city first (what the design asks), then unused within 2 km. So in practice names are unique per city until the city has about 80 tier-1 streets.
- **Sound-alike rule:** never suggest or accept a name whose phonetic key is within edit distance 1 of a name within 2 km.
- Duplicates across a city are resolved at lookup by quarter and distance (design "Laquelle ?" list).
- **Pool exhausted** within 2 km (138 words plus twins): suggestions become tier-1 word + one qualifier from `Grand`, `Petit`, `Bleu`, `Jaune`, `Blanc` ("Grand Manguier"), 690 more names; free text always remains possible. At pilot scale (5 streets) this never happens.

### 3.5 The 3-suggestion picker
```
suggest(pin, city, lang, seed):
  near  = names (incl. aliases, twins) of streets within 2 km of pin
  city  = names used anywhere in the city
  ok(w) = w not in near and phonetic(w) not within 1 of phonetic(near)
  for group in [fruit, tree, bird]:
     pool = tier-1 words of group with ok(w), preferring w not in city
     pick one with a seeded shuffle (seed = hash(deviceId, day, page))
  if a group is empty: take from tier 2, then from qualifier combos
  return 3 words, each with fr, en, group, poolId
```
"Autres idées" increments `page` (new set; the same set comes back on reload). The server re-checks `ok(w)` on submit, since a neighbour may have taken the word in the meantime (409 `name_taken_nearby`, the UI shows a new set).

### 3.6 Filter for user-written names (`validateStreetName`)
1. Clean like `clean()` in `placeValidation.js`; 2-24 characters, at most 3 words, each word at most 14 characters (fits the 2-line address plate of the design).
2. Allowed: Latin letters with French accents, space, hyphen, apostrophe. No digits (they clash with house numbers), no emoji, no other scripts (homoglyph tricks).
3. Strip a leading type word (`rue`, `avenue`, `boulevard`, `chemin`, `allée`, `impasse`, `street`, `road`...) since Anzi adds "Rue"; refuse if nothing is left.
4. Normalise for checks: fold accents, lowercase, map leetspeak (`0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`), collapse repeated letters, also test the string with spaces and hyphens removed.
5. Blocklist (constant in `streetNames.js`, reviewed locally): FR, EN, Pidgin and camfranglais insults and sexual words; ethnic group names; party names, acronyms and emblems; religious words; office titles (maire, préfet, ministre, président, chef, lamido, fon); "officiel", "official", "anzi". Whole-token match for short entries, substring match for long unambiguous ones.
6. Reserved: landmark words (pharmacie, école, église, mosquée, marché, gare, carrefour, pont, stade, hôpital...), city names, quarter names seen in `Place.quarter` plus a seed list.
7. Sound-alike rule of 3.4.
8. A typed word equal to a pool word becomes that pool word (same twin, no review).
9. Any other free-text name is shown at once as provisional, but has `needsReview: true`: it cannot become `accepted` before the moderator approves it. Person names cannot be detected by code; the UI says "un mot, pas le nom d'une personne", and the review catches the rest.
Rejection message is the design's "Choisissez un autre mot."; the API returns 400 `fields: ["name"]` with no reason (no hint on how to get around the filter).

Phonetic key (French-leaning, about 20 lines): fold and lowercase; `ph→f`, `qu→k`, `gu+e/i→g`, `c+e/i/y→s`, `c→k`, `g+e/i/y→j`, `eau|au→o`, `ai|ei→e`, `ou→u`, `an|en|am|em→A`, `on|om→O`, `in|ain|ein|un|im→I`, `y→i`, drop `h`, collapse doubles, drop final `e|s|t|x|d`. A test asserts that no two pool words share a key or are within distance 1.

## 4. Naming lifecycle

### 4.1 States
`nameStatus`: `unnamed -> proposed -> accepted` (plan section 1), plus `nameSource`: `community` | `osm` | `official`.

| State | Shown as | Lookup by "name + number" |
|---|---|---|
| unnamed (no active proposal) | "4, rue sans nom · Bastos" (design) | not possible: only the code works |
| proposed (at least one active proposal) | leading proposal + badge "provisoire" | yes, with the provisional name |
| accepted (community) | the name; card footer "Nom de rue communautaire, non officiel." | yes |
| osm (seeded name) | the OSM name; same footer wording as the design decides | yes; users cannot propose over it |
| official | the commune's name; community name kept as an alias | yes, by both names |

Leading proposal = most valid confirmations; tie broken by the older proposal.

### 4.2 Who may propose and confirm
- **Eligible device**: a valid device cookie (`verifyDeviceToken`) that owns at least one place with `status: "live"` and this `streetId` (numbered or waiting), any visibility. A device counts once per street even with several places there.
- **Propose**: any eligible device, once per street; at most 3 active proposals per street. The first registrant proposes inside the create request (tap a suggestion, write a word, or skip).
- **Confirm**: any eligible device other than the proposer; one vote per device per street (confirming another proposal moves the vote; withdrawing is allowed). The design's "Ce nom vous convient ? [Oui, je confirme]" during creation sends `confirmName: true` with the create request, so the new place and its vote are recorded together.
- **Accepted** when the leader has **at least 3 valid confirmations from devices other than the proposer** (**[decide] 5**), strictly more than the runner-up, and (free-text names only) the moderator approved it.
- **Sybil damping** (no accounts, so this is best effort): confirmations from the same hashed IP on the same day count once; a confirmation stops counting when the device no longer has a live place on the street (checked when counting, not stored); every acceptance enters the moderator queue as an audit item that can be reverted. Each fake neighbour costs a place created within 60 m of the line under the existing create limits.
- Proposals with no confirmation that are not leading expire after 90 days.

### 4.3 Competing proposals, ties and reports
- Two proposals both at 3 or more and tied: no acceptance; the street goes to the moderator queue (`moderation: "tie"`); the leader is still shown as provisional.
- A user who disagrees taps "Proposer un autre nom": a new proposal, subject to the same filter and the 3-active limit.
- `POST /api/reports` on a street name, reasons `insult | person | political | wrong | other`. Two reports from distinct devices and IP hashes on a community name hide that name (the street shows as "rue sans nom", codes keep working) until the moderator decides: restore, reject (the name is blocked on that street; insults go to the blocklist), or rename.
- Moderator = the owner only for now (plan). Queue: free-text names to review, ties, reports, acceptances (audit), waiting streets (draw a line), wrong-street reports. Protected admin API (section 8).

### 4.4 Renames and aliases
- After acceptance, a different name needs 5 valid confirmations, more than the current name's confirmations, and moderator approval.
- On any rename, the old name goes to `aliases` with `until` and `reason` (`renamed` | `official` | `hidden`). Old names keep resolving forever ("ancien nom : {x}", and the design's rename notice "La rue {old} s'appelle maintenant {new}. L'ancien nom marche toujours."). Aliases count for the 2 km uniqueness rule, so an old name is never reused nearby.
- Numbers never change on a rename; labels are keyed by `streetId`, not by name.
- Hidden names (reports) are not aliases for lookup while hidden.

### 4.5 Official commune names
- Only the moderator sets `officialName`, with `officialSource` (council deliberation reference, a photo of the plate, or the commune's published list) and `officialAt`.
- Effect: `nameSource: "official"`, display name = official name, the community name becomes an alias ("aussi appelée Manguier" on the street page), proposals close.
- Anzi numbers stay. If the commune has numbered the houses too, the owner can add the plate as `officialNumber` (free text, 20 characters) on their place; the card shows it first and the Anzi number second. Anzi never presents its own numbers as official.

## 5. Lookup

One box (design: "Manguier 12", "12 rue manguier bastos" or the code). Parser in `NextJS/utils/addressQuery.js` (client-safe, pure, so `/find` can show "did you mean" offline later).

### 5.1 Normalisation
1. Reject non-strings; cut to 60 characters (`MAX_SEARCH_LENGTH`).
2. If `normalizeCode(q)` succeeds, it is a **code** (existing path). Done.
3. Fold: NFD, remove marks, lowercase; `’ ' , . ; : / # °` become spaces, except a dot between digits ("1.750", the commune's numeric street names in OSM); collapse spaces.
4. Split letter/digit boundaries: `manguier12` → `manguier 12`, `12rue` → `12 rue`; keep `12b` as a number with suffix when exactly one letter follows the digits.
5. Drop number words: `n`, `no`, `n°`, `num`, `numero`, `number`, `nr`.
6. Drop street type words: `rue r av ave avenue bd boulevard blvd chemin ch allee impasse imp ruelle street st road rd lane ln close way drive`.
7. Drop articles and prepositions: `de des du d la le les l the of`.
8. Name tokens: a final `s` or `x` is removed for keys longer than 4 letters (`manguiers` → `manguier`, `bambous` → `bambou`).

### 5.2 Grammar
After normalisation the tokens are one of:
```
query    := code | address | words
address  := name number [place] | number name [place]
number   := digits [letter]          // 1..9999, letter in SUFFIXES
name     := word {word}              // 1-3 words, or a commune numeric name "1.750"
place    := quarter [city] | city    // trailing words that match a known quarter or city
words    := anything else            // public name search (existing ?search= behaviour)
```
Exactly one number token is required for an address; with two numbers ("rue 1.750 12"), the dotted one is the name. Trailing words are tried as quarter and city first (longest match against the street table's `quarterKey` and `cityKey`), and the rest is the name.

### 5.3 Matching and ambiguity
1. Candidate streets by `nameKey` in current names, aliases, and pool twins (`match: exact | alias | twin`).
2. If none: phonetic key equal, then edit distance <= 1 (<= 2 for keys of 7+ letters), limited to the context city (`match: fuzzy`, shown as "Vouliez-vous dire Manguier ?").
3. Context, strongest first: quarter or city typed in the query; `near=lng,lat` if the page already has location permission (never asked just for this); `city=` sent by the client from the last city used on this phone (kept in local storage, no new cookie).
4. Rank: typed quarter match > typed city match > distance to `near` > same city as `city` > accepted before provisional > bucketed size. Keep streets where the number can exist (inside the extent).
5. One candidate (or one clearly in context: the only one in the typed quarter, or the nearest by more than 2 km when `near` is given): `ambiguous: false`. Otherwise up to 5 results, `ambiguous: true` (design "Laquelle ?" list with quarter, distance and "ancien nom").
6. Each result follows the privacy rule of 6.3: `place` only when public, otherwise the computed `spot`.

### 5.4 Response
`GET /api/lookup?q=manguier%2012&near=11.51,3.87&city=Yaound%C3%A9`
```json
{
  "query": { "type": "address", "name": "manguier", "number": 12, "suffix": "" },
  "ambiguous": false,
  "results": [
    {
      "street": {
        "id": "66f1...", "name": "Manguier", "lang": "fr", "nameStatus": "proposed",
        "nameSource": "community", "formerName": null, "quarter": "Bastos", "city": "Yaoundé"
      },
      "number": 12, "suffix": "", "side": "even",
      "match": "exact",
      "distanceM": 1240,
      "spot": { "lng": 11.51234, "lat": 3.89012, "precisionM": 15 },
      "place": null
    }
  ]
}
```
- `place` is `publicPlace(...)` (new shape, section 7) when the place is public; `spot` then holds its exact position with `precisionM` = its accuracy.
- `type: "code"`: `results: [{ place }]`, same rules as `GET /api/places/[code]` (that route stays).
- `type: "words"`: public name search, `results: [{ place }]`, as `GET /api/places?search=` today.
- No match: 404 `{ "error": "Not found", "query": {...} }` (design "Aucune adresse « {q} »"). Bad input: 400. Rate limit: 429.

## 6. Privacy

### 6.1 The problem
Today a link-only place can only be reached with its random code: 31^4 = 923,521 codes per city prefix, sparse, and lookups are limited to 60 per minute per IP. A street address is the opposite: dense and guessable. A street uses numbers from 2 to about 300, so at 60 lookups per minute one IP reads a whole street in 5 minutes and a quarter in an hour. **If "Manguier 12" returned the place record, the default "link-only, found only by exact code" would be silently broken for every home**: anyone could list the homes of a street with name ("Chez Mama Julie"), category, landmark ("portail jaune derrière la pharmacie"), exact pin, and later the photo.

Three more leaks come with streets:
- **The number is a position.** With metric numbering, "Manguier 104" means about 490 m from the start, right-hand side. Anyone who knows the line can find the spot without Anzi. This is true of every street address and cannot be removed; it is also what makes the number useful.
- **Map tags.** The approved mock-ups draw number tags on maps, including "anonymous number tags" for non-public places (Home map preview, step-3 mini-map "existing number tags appear along the lines"). Anonymous or not, a tag shows **where a registered household is**. That is an enumeration of homes on a public map. This document overrides that part of the design (6.3, rule 7).
- **Tiny streets.** A street traced by its first user is drawn around that user's gate; "Rue Manguier · 1 adresse" tells a viewer where one registered household lives, to within about 50 m.

### 6.2 Options

| Option | Rider typing "Manguier 104" | Enumeration | Verdict |
|---|---|---|---|
| a. Street + number resolves every place (link-only too) | full card | trivial: all homes listed with names and landmarks | rejected (breaks the plan's privacy default) |
| b. Secret suffix ("Manguier 104-K7") | full card if the suffix is right | about 961x harder | rejected: kills "easy to remember" |
| c. Street + number resolves public places only; homes only by code | "not found" for most homes | none | safe but the main promise fails for riders |
| **d. "The address is a position, the record is behind the link"** | the computed spot of number 104 on the line (about 15 m, side), "Y aller"; full card only if the place is public or the rider has the code/link | none: the answer is the same whether 104 is a link-only home, a private place, retired, or was never issued | **recommended** |

### 6.3 Recommended rules (keep every rule of plan section 1)
1. Visibility keeps its meaning: `private` (owner only), `link` (default: full card for whoever has the code or link), `public` (opt-in, businesses: also searchable by name and by street + number).
2. Every place's own card and share text show street + number (the owner chooses to send them). Shared links and deep links keep using the code (`/find?code=`), as in the design.
3. `GET /api/lookup` with a street + number: if the label is active and its place is `public` and `live`, return the public card. **In every other case** (link-only, private, hidden, retired, moved, never issued, any valid suffix) return the same body: street, number, and a `spot` computed **from the line only** (point on the centreline at the slot, side, `precisionM: 15`), never from the stored pin. The controller always reads the label (same queries in both cases), so the response does not depend on whether a place exists.
4. A number that cannot exist on that street (beyond the extent, below 2) answers "Aucune adresse" whatever is stored. That reveals only the street's length, which is public.
5. Code lookup unchanged (link and public: full card; private: owner only, 404 for others).
6. Name search unchanged: public places only.
7. **Maps and lists show no per-household data for non-public places.** Number tags are drawn only for public places and, on the viewer's own phone, for the viewer's own places (from local storage, drawn client-side, never baked into a shared server image). Instead of anonymous tags, lines carry **milestone tags** computed from geometry (the number a spot would have every 50 m, e.g. 10, 20, 30...). They show "numbers go up along the street" without revealing registrations. The step-3 number box shows the user's own computed number. `GET /api/streets/[id]/places` lists public places only.
8. Counts are bucketed everywhere: "1-4", "5-19", "20+" (design "{n} adresses" becomes "quelques adresses" / "{n} adresses" from 5). The Home chip "{s} rues, {n} adresses" stays city-wide (no leak).
9. Community streets (traced lines and waiting anchors) with fewer than 3 places are not drawn on public maps (Home preview, `/map`); they appear only in the step-3 picker (neighbours must find them) and in lookups. OSM lines carry no household information and are drawn as usual.
10. Street names: free-text names that look like a person's name or contain digits are refused or held for review (a name like "Rue de Mama Julie" would identify a household).
11. Device ids of proposers and confirmers never leave the server. Lookup text and coordinates are not logged (existing hook rule).
12. Delete: the place document is removed as today; its label keeps only `{streetId, houseNumber, houseSuffix, state: "retired", dates}`, no personal data. The contributor-log rule of the plan is unchanged.
13. Create flow, step 2, for `home`: hint "Choisissez un nom que vous acceptez de montrer (ex. « Maison bleue »)", because the card with name + street + number + landmark identifies a home to whoever receives it.

What a stranger can learn about a link-only home under these rules: its street name and number, if they already know them, and the spot that number stands for. The same holds for any painted house number. They cannot learn the name, category, landmark, photo or exact pin, or whether a given number is registered.

### 6.4 What the owner must decide (**[decide] 2**)
Accept option d: for homes, typing "Manguier 104" gives the spot and side (enough for a rider to get within about 15 m) but not the card; the card needs the code or the link that the owner shares. The alternative that is still safe is option c ("not found" for homes). Option a is not acceptable under the plan's privacy defaults. The design's "anonymous number tags" must go either way.

## 7. Data model

Repo rules apply: validators on every field, no defaults that hide missing data, indexes in the schema, client never sets status, code, number or ownership fields.

### 7.1 `NextJS/models/streetModel.js` (new)
```js
const SUFFIX_RE = /^[A-HJKMNP-Z]?$/; // "" or one letter, no I, L, O

const aliasSchema = new Schema({
  name:    { type: String, required: true, maxlength: 60, trim: true },
  nameKey: { type: String, required: true },
  lang:    { type: String, enum: ["fr", "en"] },
  reason:  { type: String, required: true, enum: ["renamed", "official", "hidden"] },
  until:   { type: Date, required: true },
}, { _id: false });

const confirmationSchema = new Schema({
  ownerId: { type: String, required: true },          // device id, never returned
  ipDay:   { type: String, required: true },          // hashIp(ip) + ":" + yyyy-mm-dd, for sybil damping
  at:      { type: Date, required: true },
}, { _id: false });

const proposalSchema = new Schema({
  name:          { type: String, required: true, minlength: 2, maxlength: 24, trim: true },
  nameKey:       { type: String, required: true },
  lang:          { type: String, required: true, enum: ["fr", "en"] },
  poolId:        { type: String },                      // set when the word comes from the pool
  byOwnerId:     { type: String, required: true },
  confirmations: { type: [confirmationSchema], required: true },
  needsReview:   { type: Boolean, required: true },     // free text: true until the moderator approves
  state:         { type: String, required: true, enum: ["active", "accepted", "rejected", "expired", "hidden"] },
  createdAt:     { type: Date, required: true },
});

const streetSchema = new Schema({
  name:        { type: String, maxlength: 60, trim: true },   // null while unnamed; OSM/official names may exceed 24
  nameKey:     { type: String },
  lang:        { type: String, enum: ["fr", "en"] },
  poolId:      { type: String },
  nameStatus:  { type: String, required: true, enum: ["unnamed", "proposed", "accepted"] },
  nameSource:  { type: String, required: true, enum: ["community", "osm", "official"] },
  officialName: { type: String, maxlength: 60, trim: true },
  officialSource: { type: String, maxlength: 200 },
  officialAt:  { type: Date },
  aliases:     { type: [aliasSchema], required: true },
  proposals:   { type: [proposalSchema], required: true },

  geometry: {                                              // Point while waiting, LineString when ready
    type:        { type: String, required: true, enum: ["Point", "LineString"] },
    coordinates: { type: Schema.Types.Mixed, required: true },   // checked by validateGeometry() in utils/streetNumbering.js
  },
  lineStatus:  { type: String, required: true, enum: ["waiting", "ready"] },
  lineSource:  { type: String, enum: ["osm", "trace", "moderator"] },
  osmWayIds:   { type: [Number] },
  originS:     { type: Number },                           // required when ready (schema-level validator)
  baseSlot:    { type: Number, enum: [5, 50] },
  evenSide:    { type: String, enum: ["right", "left"] },
  lengthM:     { type: Number, min: 0, max: 3000 },

  quarter:     { type: String, maxlength: 60, trim: true },
  quarterKey:  { type: String },
  city:        { type: String, required: true, maxlength: 60, trim: true },
  cityKey:     { type: String, required: true },
  region:      { type: String, required: true, enum: REGIONS },

  placeCount:  { type: Number, required: true, min: 0 },   // cache, maintained with $inc, recount script
  firstOwnerId: { type: String },                          // null for OSM streets
  moderation:  { type: String, required: true, enum: ["none", "review", "tie", "reported", "line"] },
  status:      { type: String, required: true, enum: ["live", "hidden"] },
}, { timestamps: true });

streetSchema.index({ geometry: "2dsphere" });
streetSchema.index({ cityKey: 1, nameKey: 1 });
streetSchema.index({ "aliases.nameKey": 1 });
streetSchema.index({ moderation: 1, updatedAt: -1 });
```
A schema-level `validate` hook requires `lineSource`, `originS`, `baseSlot`, `evenSide`, `lengthM` and a LineString when `lineStatus` is `ready`, and a Point when `waiting`. The interior-frozen rule is enforced in code by `extendLine(old, next)` (refuses any change other than added end vertices), not by the schema.

### 7.2 `NextJS/models/addressLabelModel.js` (new): every label ever issued
```js
const addressLabelSchema = new Schema({
  streetId:    { type: Schema.Types.ObjectId, ref: "Street", required: true },
  houseNumber: { type: Number, required: true, min: 2, max: 9999, validate: Number.isInteger },
  houseSuffix: { type: String, match: SUFFIX_RE },        // always set by the controller ("" or a letter)
  placeId:     { type: Schema.Types.ObjectId, ref: "Place" },   // kept when moved, removed when retired
  state:       { type: String, required: true, enum: ["active", "moved", "retired"] },
}, { timestamps: true });

addressLabelSchema.index({ streetId: 1, houseNumber: 1, houseSuffix: 1 }, { unique: true });
addressLabelSchema.index({ placeId: 1 });
```
(Mongoose's `required` rejects `""`, so `houseSuffix` is validated by `match` and always written explicitly.) The unique index is the allocation lock: no transaction needed (Atlas M0 transaction support not relied on).

### 7.3 `Place` changes (`NextJS/models/placeModel.js`)
```js
streetId:       { type: Schema.Types.ObjectId, ref: "Street" },          // absent = "je ne sais pas"
houseNumber:    { type: Number, min: 2, max: 9999, validate: Number.isInteger },  // WAS String typed by the user
houseSuffix:    { type: String, match: SUFFIX_RE },
numberStatus:   { type: String, required: true, enum: ["none", "waiting", "issued"] },
numberedAt:     { type: Date },
alongM:         { type: Number },     // s - originS at numbering time (audit, line re-alignment)
offsetM:        { type: Number },     // signed lateral offset at numbering time
pinAdjusted:    { type: Boolean },    // user moved the pin on the mini-map before numbering
officialNumber: { type: String, maxlength: 20, trim: true },             // commune plate, typed by the owner

placeSchema.index({ streetId: 1, visibility: 1, status: 1, houseNumber: 1 });
```
Existing fields and indexes stay. `quarter` and `city` remain on Place (prefilled from the street, editable, design step 4).

### 7.4 Report (plan section 2, `NextJS/models/reportModel.js`)
`{ targetType: enum street|place, targetId: ObjectId, reason: enum insult|person|political|wrong|other, reporterHash: String (hash of device id), ipHash: String, createdAt }`, index `{ targetType, targetId }`. Distinct reporters are counted by `reporterHash` and `ipHash`.

### 7.5 Stored vs derived
- **Stored:** line, `originS`, `baseSlot`, `evenSide`; labels; the number on Place (copy of its active label, for fast reads); `alongM`/`offsetM`; names, aliases, proposals; `placeCount` (cache).
- **Derived, never stored:** side/parity (from the number), slot, the spot of any number, milestone tags, display strings ("Manguier 12", "12 Rue Manguier, Bastos, Yaoundé", "4, rue sans nom"), count buckets, the number of valid confirmations (counted from current eligibility).

### 7.6 Migration
There is no production data in `Place`: the branch is neither merged nor pushed, and `/api/places` has never run against a real database (status.md). Dev data:
- either drop the dev `places` collection, or run a one-off `NextJS/scripts/migrate-place-numbers.mjs`: for each Place, if `houseNumber` is a non-empty string, move it to `officialNumber` (it was a number typed by the user), unset `houseNumber`, set `numberStatus: "none"`;
- local copies on test phones (`anzi.places.v1`): bump the key to `anzi.places.v2` and refetch `?mine=1` when online; v1 entries stay readable offline (`isPlace` checks only code, name, lat, lng) and a string `houseNumber` is shown as `officialNumber`.
The legacy `Address` model is not touched (retired separately, plan Phase 1).

## 8. API

All routes under `NextJS/app/(pages)/api/`, each a `route.ts` (HTTP verb, `await connectToDatabase()`) plus a controller `.js` returning `NextResponse`, as today. Writes use the existing `guardWrite` (same origin + IP limit) and the device cookie; every limit uses `allow()` from `utils/rateLimit.js` with hashed IPs. Errors are generic; 409 bodies carry a fixed `reason` code, never a database message.

### 8.1 Endpoints

| Method and path | Controller | Purpose | Who | Rate limits | Status codes |
|---|---|---|---|---|---|
| `GET /api/streets?near=lng,lat` | `streets/streets_controller.js` | Step-3 picker: up to 5 streets with `distanceM`, name, status, count bucket, and the ideal number + side for this pin (no label check, 2.3) | anyone | `streets-ip` 60/60 s | 200, 400 |
| `GET /api/streets/suggestions?near=&lang=&page=` | same | 3 names (3.5) | anyone | `suggest-ip` 30/60 s | 200, 400 |
| `GET /api/streets/[id]` | same | public street: name, status, source, aliases, quarter, city, bucket, milestone tags | anyone | `streets-ip` | 200, 400, 404 |
| `GET /api/streets/[id]/places?page=` | same | "neighbours": **public** places on the street by number, 20 per page | anyone | `streets-ip` | 200, 400, 404 |
| `POST /api/streets/[id]/proposals` | `streets/proposals_controller.js` | propose a name `{ suggestion, lang }` or `{ name, lang }` | eligible device | `propose-device` 5/day, `propose-ip` 20/day | 201, 400, 403, 404, 409 (`name_taken_nearby`, `too_many_proposals`, `already_proposed`, `name_locked`), 429 |
| `POST /api/streets/[id]/proposals/[pid]/confirm` and `DELETE` (withdraw) | same | confirm or withdraw a vote; returns the new street status | eligible device, not the proposer | `confirm-device` 20/day, `confirm-ip` 50/day | 200, 400, 403, 404, 409, 429 |
| `POST /api/reports` | `reports/reports_controller.js` | report a street name or a place | anyone (device hash if present) | `report-ip` 10/day | 202, 400, 404, 429 |
| `GET /api/lookup?q=&near=&city=` | `lookup/lookup_controller.js` | one-box lookup (section 5), privacy rule of 6.3 | anyone | `lookup-ip` 60/60 s (same scope as code lookup) | 200, 400, 404, 429 |
| `POST /api/places` **(changed)** | `places/places_controller.js` | create, join or create a street, propose or confirm a name, get a number | device (minted if absent) | existing + `street-create-device` 3/day, `street-create-ip` 10/day | 201, 400, 403, 404 (`streetId`), 409 (`too_far_from_street`, `past_street_end`, `street_exists_nearby`, `name_taken_nearby`), 429, 503 (no free label after 30 tries) |
| `PATCH /api/places/[code]` **(changed)** | same | `officialNumber`; move `{ street: {...} }` (2.6) | owner | `edit-ip`, `move-device` 3/day | 200, 400, 404, 409, 429 |
| `DELETE /api/places/[code]` **(changed)** | same | also retires the label, `$inc placeCount -1`, removes the device's confirmations on that street | owner | `edit-ip` | 200, 404 |
| `GET /api/places?mine=1`, `GET /api/places/[code]` **(changed shape)** | same | new place shape (8.3) | as today | as today | as today |
| `GET /api/admin/queue`, `POST /api/admin/streets/[id]/line`, `POST /api/admin/streets/[id]/name` (approve, reject, set official), `POST /api/admin/places/[code]/move` | `admin/admin_controller.js` | moderation; setting a line numbers the waiting places in creation order | moderator: `Authorization: Bearer <ADMIN_TOKEN>` (new server-only env var, >= 32 chars, `timingSafeEqual`), same origin | `admin-ip` 300/day | 200, 400, 401, 404, 409 |

`ADMIN_TOKEN` is a new secret, so it needs the owner's OK. It sits in `.env.local` and Vercel only.

### 8.2 `POST /api/places` body (new part)
```json
{
  "lng": 11.5167, "lat": 3.8667, "accuracyM": 8, "pinAdjusted": true,
  "name": "Maison bleue", "category": "home", "city": "Yaoundé", "region": "Centre",
  "quarter": "Bastos", "landmark": "portail jaune", "visibility": "link",
  "consent": true, "adultOrParentOk": true, "officialNumber": "",
  "street": { "streetId": "66f1c0ffee0000000000abcd", "confirmName": true }
}
```
`street` is one of:
- `{ "streetId": "<24 hex>", "confirmName"?: boolean }`: join; `confirmName` counts as a confirmation of the leading proposal (design "Oui, je confirme").
- `{ "new": { "suggestion"?: "<poolId>", "name"?: "<free text>", "lang": "fr" | "en", "line"?: [[lng, lat], ...], "confirmNew"?: boolean } }`: create a street; no suggestion or name = unnamed; no line = waiting.
- absent or `null`: no street ("je ne sais pas"): code only, `numberStatus: "none"`.

Validation (`validateNewPlace` grows a `street` part; pure functions in `utils/streetNumbering.js` and `utils/streetNames.js`):
- `streetId` passes `isValidId`; exactly one of `streetId` / `new`.
- `suggestion` is a pool id; `name` passes `validateStreetName`; not both.
- `line`: 2-8 points, finite, inside `BOUNDS`, consecutive points 5-400 m apart, total 20-400 m; the pin within 60 m laterally and inside the extent.
- Top-level `houseNumber`, `houseSuffix`, `numberStatus`, `streetId` sent by the client → 400 `fields: ["houseNumber"]` (server-owned, like `code`).
- `pinAdjusted` boolean, `officialNumber` as other text fields (20 characters).

Controller order: guard (origin, IP) → device → limits → body → validate → load street (404) → geometry check (409) → new street: duplicate check (409 unless `confirmNew`), name check (409) → create Street if new → pre-generate the place `_id` → if the line is ready, allocate the label (candidates of 1.4; `AddressLabel.create`; `11000` → next candidate) → `Place.create` with the existing code retry loop → if that fails, delete the label just inserted (it was never shown) → `Street.updateOne` (`$inc placeCount`, push proposal or confirmation) → 201.

### 8.3 Place response shape (`publicPlace`)
Adds `street: { id, name, lang, nameStatus, nameSource, quarter, city } | null`, `houseNumber: number | null`, `houseSuffix: string`, `side: "even" | "odd" | null`, `numberStatus`, `officialNumber`. No `alongM`, `offsetM`, `pinAdjusted`, owner or proposal data.

### 8.4 Breaking changes (public interface)
1. `houseNumber` changes meaning and type: a string typed by the user becomes an integer computed by the server, with `houseSuffix` and `numberStatus`. Clients that send it get 400. The typed municipal number moves to `officialNumber`.
2. The place response grows (8.3) and `houseNumber` may be `null`. Touches `types/place.ts` (`PlaceView`), `utils/share.ts` (`addressLine`, `buildShareText`) and `share.test.ts`, `components/app/create-flow.tsx` (house number field removed, street step added), `mine-flow.tsx`, `find-flow.tsx`, `utils/localPlaces.ts` (key v2), `i18n/dictionary.ts`.
3. PATCH whitelist: `houseNumber` removed; `officialNumber` and `street` (move) added.
4. `/find` switches to `GET /api/lookup`; `GET /api/places/[code]` stays (deep links); `GET /api/places?search=` stays until `/find` no longer calls it, then is removed.
5. DELETE also retires the label (no response change).
6. Share text and card lead with the street address once issued; the code becomes "Code de secours" (design).
No API versioning: the app is the only client and is deployed with the API; the service worker is network-first for pages, so stale pages are short-lived.

## 9. Test plan and implementation order

### 9.1 Tests (Vitest, node environment, `*.test.js` next to the code)
Pure functions first (no mocks):
- `utils/streetNumbering.test.js`
  - `project()`: straight and curved lines, points before the start and past the end (extended end segments), sign of the offset (left > 0), nearest segment at a sharp bend.
  - `idealNumber()`: worked examples of 1.6 (56 on an OSM line at 230 m right; 100/101 at a trace start; 96/97 at 25 m behind; 124/125 at 80 m past a 40 m line); errors `too_far_from_street` at 61 m, `past_street_end` at 121 m past and below 2.
  - `candidates()`: order exact → neighbour toward the fraction → A, B, C...; never yields I, L, O; never below 2.
  - `extendLine()`: appending keeps every existing number; prepending adds the new length to `originS` and keeps them; any interior change throws.
  - `spotFor(street, number)`: round trip `idealNumber(spotFor(n)) === n` for both sides along a curved line; milestone tags every 50 m.
  - `validateLine()`: 2-8 points, distances, `BOUNDS`, length cap.
- `utils/streetNames.test.js`: `nameKey` (accents, case, plural), `phoneticKey`; **pool integrity** (138 entries, unique ids, unique FR and EN keys, no two pool keys within phonetic distance 1, 3-12 letters, no digits); `suggest()` (one per tier-1 group, excludes names and sound-alikes within 2 km, prefers city-unused, same seed same set, next page new set, tier 2 and qualifiers when exhausted); `validateStreetName()` (length, digits refused, other scripts refused, leetspeak insult caught, type word stripped, reserved landmark word refused, pool word mapped to its pool id).
- `utils/addressQuery.test.js`: "Manguier 12", "manguier12", "MANGUIER 12B", "12 rue Manguier Bastos", "12, rue des Manguiers, Bastos, Yaoundé", "Rue Manguier N° 12", "12 Mango Street", "rue 1.750 12" (numeric commune name), "yde 7k4m" (code), "pharmacie du lac" (words), "" and 61+ characters (null).

Controllers with mocked models (same style as `places_controller.test.js`: `vi.hoisted` mocks of `Street`, `AddressLabel`, `Place`, `RateLimit`, `Report`; `makeReq` with cookie, headers and search params):
- `streets_controller.test.js`: 400 on bad or out-of-`BOUNDS` `near`; `$nearSphere` with `$maxDistance: 150`; response has no geometry, owner ids or exact counts; 429.
- `places_controller.test.js` (extended): join a ready street → label allocated and number on the place; duplicate label (`11000`) → next candidate; client `houseNumber` → 400; unknown `streetId` → 404; pin 61 m away → 409 `too_far_from_street`; new street with suggestion and trace → street created with `baseSlot: 50`; new street without trace → `numberStatus: "waiting"`; duplicate nearby → 409 unless `confirmNew`; `confirmName` adds one confirmation; Place failure after label insert → label deleted; DELETE → label `retired`, `placeCount` -1; PATCH move → old label `moved`, new label active.
- `lookup_controller.test.js`: code path unchanged; public place → full card; **privacy regression: the JSON bodies for a link-only place, a private place, a retired label and a never-issued number on the same street are identical**; number past the extent → 404; alias, twin and fuzzy matches; ambiguity list ranked by typed quarter then `near`; 400, 429.
- `proposals_controller.test.js`: non-eligible device → 403; proposer cannot confirm; one vote per device (moves); acceptance at 3 valid confirmations, not at 3 with two from the same IP and day; tie → `moderation: "tie"`; free-text name not accepted before review; report threshold hides the name.
- `admin_controller.test.js`: 401 without or with a wrong token (timing-safe compare); setting a line numbers waiting places in creation order.

Manual checks once (dev Atlas M0, not in CI): 2dsphere index on a field holding Points and LineStrings builds; `$nearSphere` on LineStrings sorts by distance to the nearest point; unique index on labels. Real-phone check: GPS accuracy and pin nudge in the pilot area (simulation assumptions).

### 9.2 Implementation order (each stage one commit, `verify` green: lint, tsc, tests, build)
1. **Numbering core**: `utils/streetNumbering.js` + tests. Pure, no I/O. Verify: tests above pass.
2. **Names**: `utils/streetNames.js` (pool, keys, filter, suggest) + tests. In parallel, send the pool to local readers. Verify: pool integrity test.
3. **Query parser**: `utils/addressQuery.js` + tests.
4. **Models**: `streetModel.js`, `addressLabelModel.js`, `reportModel.js`, Place fields, dev migration script. Verify: tsc, tests; manual index check on a dev cluster.
5. **Street reads**: `GET /api/streets`, `/suggestions`, `/[id]`, `/[id]/places` (use the `new-endpoint` skill). Verify: controller tests.
6. **Create with streets** (the breaking change): `POST /api/places` street part, DELETE retire, PATCH `officialNumber`; `publicPlace`, `PlaceView`, `share.ts`, `localPlaces` v2, minimal create-flow change (remove the house number field, show the new address line). Verify: all tests, build, and a manual create against a dev DB.
7. **Lookup**: `GET /api/lookup` + `/find` uses it. Verify: privacy regression test.
8. **Naming**: proposals, confirm, reports. Verify: controller tests.
9. **Create flow step 3 UI** (design): picker, number box, suggestion tiles, 2-tap trace and pin nudge on the mini-map, milestone tags. Verify: `mobile-check` skill, 5-person wording test.
10. **Moderator**: admin endpoints and a minimal protected page; draw lines; number waiting places. Needs `ADMIN_TOKEN` (owner).
11. **OSM import** for the pilot box (after decision 3 and the licence check). Verify: dry run prints streets, lengths, split points.
12. **Move to another street** with redirects.
Stages 1-3 can start now; they change no public interface. Stage 6 is the first breaking one.

## 10. Open decisions and unverified items

### 10.1 Decisions for the owner
1. **Line first.** A number is issued only on a real street line (OSM seed, 2-tap trace by the first user, or the moderator). Without one, the place gets its street and code now and its number later, once. *Recommended.* Alternative: immediate numbers guessed from GPS points. The simulation gives wrong sides for about 35 % of houses and splits streets into several, and frozen numbers can never be corrected.
2. **Privacy model (6.2 d).** For non-public places, street + number returns the computed spot, never the record; the full card needs the code or link. Number tags on maps only for public places and the viewer's own (milestone tags otherwise), which replaces the design's "anonymous number tags". *Recommended.* Safe alternative: homes "not found" by street + number (option c).
3. **OSM seed for the pilot area** (one-off import, ODbL attribution, OSM names kept as usual names). *Recommended* once the licence question is checked; without it, every first user on a street must trace or wait for the moderator.
4. **Names: uniqueness and language.** Unique within 2 km (suggestions prefer unused in the city), word stored in its own language, never translated, street type word following the name's language ("Rue Manguier" for everyone, "Mango Street" for everyone). *Recommended.* Alternatives: strictly unique per city (runs out at about 140 streets), or per quarter (quarters are free text today).
5. **Acceptance rule.** 3 valid confirmations from neighbours other than the proposer, same IP and day counted once, free-text names reviewed by the moderator, renames after acceptance only with moderator approval. *Recommended.* Alternative: count the proposer (faster, easier to game).

Also needed from the owner, not design choices: OK for the new `ADMIN_TOKEN` secret, and the local readers for the noun list.

### 10.2 Could not verify
- That MongoDB `$nearSphere` on a 2dsphere field holding LineStrings sorts by distance to the nearest point of the line, on Atlas M0; and that M0 builds that index on a field mixing Points and LineStrings. Believed yes, test once (fallback: also store vertices as a MultiPoint).
- OSM coverage and accuracy of small residential streets in the pilot area (only "Yaoundé and Douala mostly mapped" and the UN Maps 2026 figures are in `docs/research-2026-10.md`); ODbL duties when storing derived lines and names.
- Real phone GPS error in dense quarters. The simulation assumed Gaussian error with the reported accuracy as a 68 % radius; multipath next to walls is biased, not random, so real errors may be worse than the table in 1.3. That makes the pin nudge more important, not less.
- Whether "even on the right, odd on the left, from the end nearest the centre" (the French convention) matches what Cameroonian communes use where they number houses.
- The noun list's local connotations: party emblems (flambeau, crabe are excluded on a guess), slang, totems, first names. Needs local readers.
- How non-technical users handle the 2-tap trace on a 200 px mini-map; test with the 5-person wording test. If it fails, decision 1 still holds through OSM and the moderator.
- Prototype: scratch scripts outside the repo (`sim.mjs`, `sim2.mjs`, `sim3.mjs` in the session scratchpad), synthetic streets only; not part of the repo, not reviewed.
