# Status — anzi

> Living memory of the project. Read at session start (first lines are auto-injected). Keep it short: summarise, don't append forever.

## Goal
Anzi: Next.js app where users view a map of addresses (Mapbox), and submit new addresses or address requests. Backed by MongoDB via Mongoose. Kind: poc.

## Current state (2026-10-11)
- Branch `chore/refresh-foundations` (not merged): Phase 0 done except the map spike; Phase 1 slice 1 (API) done. Next 16.4, React 19, mongoose 9, sharp 0.35, ESLint 9 (flat config, `eslint .`), Vitest 3->5 (needs Node >= 22.12). Plain `npm ci` passes; lint, `tsc`, 40 tests and `next build` pass (7 commits ahead of `main`, nothing pushed).
- DB URI is now `MONGODB_URI` (server-only). Local `.next` had no URI, but it was built without env, so it proves nothing about the deployed bundle; only server `route.ts` files import `connectMongo`, so a leak is unlikely. Rotating the password is still the owner's action.
- Security fixes: place names rendered as text (popup, geocoder suggestions); `/api/address` validates id/coordinates, escapes the search regex, caps length, returns generic errors. Regression tests in `utils/validate.test.js` and `address_controller.test.js`.
- Removed: auth pages, testimonials, blocks, newsletter and `/api/mailing` (+ model), directions plugin, unused images and video, dead PUT/DELETE stubs. Landing (hero, features, zigzag, footer) and the three form pages remain until Phase 1.
- Phase 1 slice 1 done: `Place` model + `/api/places` (POST create, GET `?mine=1` / `?search=`, `[code]` GET/PATCH/DELETE). Device-token cookie (HMAC, `DEVICE_TOKEN_SECRET`), Mongo-backed rate limits (no new service), link-only by default, consent stored, same-origin check on writes. Legacy `PUT`/`DELETE` `/api/address` removed (open writes, no caller).
- Phase 1 slice 2 done (UI, 3 commits): route group `app/(app)` (light, mobile-first shell with bottom nav and FR/EN toggle) with `/create` (GPS with accuracy, name/category, city/region/landmark, consent + 18+ check, address card, WhatsApp/Google Maps/copy), `/find` (code lookup or public name search, `?code=` deep link) and `/mine` (server list + local offline copy, visibility change, delete). i18n: `i18n/dictionary.ts` (fr default, en), language in cookie `anzi_lang`, else Accept-Language. Share text and card never show a URL; `NEXT_PUBLIC_SITE_URL` is read only in `utils/site.ts` and `*.vercel.app` is refused. The old dark header moved from the root layout into `components/legacy-shell.tsx` (used by `(default)` and `(pages)`). 54 tests, lint, tsc, build pass; pages smoke-tested over HTTP (200, French default, English via Accept-Language), but **never exercised in a real browser or against a real DB** (GPS, clipboard, WhatsApp link, cookie flow untested).
- (Home superseded by stage (b) below.) The old landing (`(default)` group, hero, features, zigzag, modal-video, page-illustration) is deleted, which also removes the Mega.nz iframe; `frame-src https://mega.nz` in the CSP and the `aos` dependency are now unused (left for you to approve). Header links on legacy pages still point to the old forms.
- PWA: `app/manifest.ts`, icons in `public/icons/` (pin-house mark, generated with sharp), `public/sw.js` (network-first for `/`, `/create`, `/find`, `/mine`, cache-first for `/_next/static` and icons, never `/api`), `public/offline.html`, registered in production only by `components/app/sw-register.tsx`. Offline behaviour and the install prompt are untested in a real browser.
- CI: `.github/workflows/ci.yml` (lint, tsc, test, build on Node 22).

## Stage (a) done (2026-10-11): street data model + API + admin tool
- Pure core: `utils/streetNumbering.js` (10 m slots along the line, idealNumber/candidates/spotFor/milestones/extendLine/validateLine/orientTrace), `utils/streetNames.js` (nameKey, phoneticKey, sound-alike, `validateStreetName` with a STARTER blocklist/reserved list to be reviewed locally), `utils/streetValidation.js`, `utils/streetStore.js` (label allocation, 2 km name check).
- Models: `Street` (simplified per owner answers: one provisional name, `proposedBy`, aliases, Point while waiting / LineString when ready; no proposals/confirmations), `AddressLabel` (unique index = allocation lock), `Place` gains streetId, integer houseNumber, houseSuffix, numberStatus, alongM/offsetM, pinAdjusted, officialNumber. Legacy string `houseNumber` is gone (clients sending it get 400); dev DB: drop the `places` collection.
- API: `POST /api/places` takes `street: {streetId} | {new:{name?,lang,line?,confirmNew?}}` (join / create street / none), issues the number, 409 reasons (`too_far_from_street`, `past_street_end`, `street_exists_nearby`, `name_taken_nearby`), rolls back label and new street on failure, DELETE retires the label; a street with 5 places accepts its proposed name. `GET /api/streets?near=`, `GET /api/streets/[id]`. Responses use the new `publicPlace(place, street)` shape.
- Admin: server-only `ADMIN_TOKEN` (Bearer, timing-safe, IP-throttled, closed if unset or < 32 chars): `GET /api/admin/queue`, `POST /api/admin/streets/[id]/line` (draw / extend, then numbers waiting places in creation order), `POST /api/admin/streets/[id]/name` (accept, reject, set, official). Page `/admin` (noindex, Mapbox satellite, click to trace, name forms); never run in a real browser.
- Rejected UI adapted only enough to compile (`addressLine` leads with "12 Rue Manguier"; create-flow sends `officialNumber`). Lint, tsc, 136 tests, build pass.
- NOT done (deferred): noun pool + 3-suggestion picker, `/api/lookup`, `GET /api/streets/[id]/places`, reports, move-to-another-street, PATCH street move, OSM import, parallel-trace duplicate check. Unverified: 2dsphere index on mixed Point/LineString + `$nearSphere` on Atlas.

## Stage (b) done (2026-10-11): design system + Home, owner review pending
- Tokens in `tailwind.config.js` (night, earth, sun, clay, sand, line, field, muted, leaf, danger, you; `warm1/2` shadows; the dead purple `brown` removed, legacy `gray`/`brown` kept), component classes in `app/css/additional-styles/anzi.css` (btn, field-box, ntag, schip, hero-band, map-motif...), `ui-classes.ts` now orange. Logo `public/brand/anzi-logo.png` (trimmed, 7.5 kB) via `components/app/logo.tsx` (cream badge on dark). PWA icons regenerated from it (orange), manifest colours charcoal/sand, `themeColor` #151719.
- Shell: `app/(app)/layout.tsx` no longer draws a header; each page draws `AppBar` (dark on Home, light on `/create`, `/find`, `/mine`). `BottomNav` restyled (Trouver `/` · raised Créer · Mes adresses), `LangToggle` is the FR|EN pill.
- Home `/`: `HeroBand`, map card, `AddressSearchBox` (GET `/find?q=`), `HomeMine` (rows with category avatar, "12 Rue Manguier" title, WhatsApp send) or `HowItWorks`, `Credits`. Map card = `home-map.tsx` (server; data from `utils/homeMap.ts`: live streets + public places only, cached 10 min, 2.5 s timeout, null without DB) streamed in `Suspense` -> `map-preview.tsx` (Mapbox Static Images 360x210 at 1x, SVG street lines, number tags, name chips, collision-free labels; motif when no token/offline) wrapped by `map-card.tsx` (tap "Agrandir" -> `next/dynamic` `interactive-map.tsx`, the only mapbox-gl importer; offline/failure messages, saveData note, "you are here" only if geolocation already granted). Maths in `utils/staticMap.ts` (+ tests, 150 total).
- Measured: `/` first-load JS ~151 kB gzip (react-dom 72 + next client 43 are the framework; page code ~36 kB; the 39 kB polyfill chunk is `noModule`, not loaded by modern phones). No mapbox in any Home chunk. Over the 100 kB budget because of the framework; not reduced further.
- NOT verified: the static image weight (no `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` here, so only the motif was seen), the live map (token, WebGL, CSP), Home with real streets (no DB), a real phone. Search "Manguier 12" lands on the old `/find` (code or place name) until stage (e). `/find`, `/create`, `/mine` keep their old inner look (green bits) until their stages. Tags show public places only (open decision 3: anonymous number tags need the owner's yes).

- Owner answers after review of (b): (1) anonymous number tags for non-public addresses: yes, but only at very high zoom (17+) and only in a near zone (around the viewer / the opened street), never on Home or in wide views; needs a small rate-limited read, number only, to be built with the `/map` stage. (2) Mapbox token and URL restriction approved: owner puts `NEXT_PUBLIC_MAPBOX_TOKEN` (a `pk.` token) in `NextJS/.env.local`.

## Redesign decided (2026-10-11): the current `app/(app)` UI is REJECTED
- The owner rejected the white, text-only UI (swapped logo, no map, landing deleted). It stays in git only until replaced. **Build from `docs/design-2026-10.md` and the mock-ups in `docs/mockups/` (approved: "implement exactly that")**: dark charcoal + orange identity, the owner's Anzi logo `anzi_V3prime.png` (NOT `LOGO_TRY3_2.png`, that is Gombo), map as hero (static map image, interactive Mapbox only on tap), 3 bottom tabs, a "Y aller" sheet (default maps app via `geo:`, Google Maps, Waze, Apple Maps, copy position).
- Product core changed: the visible address is **street word + number** ("12 Rue Manguier"), the code is only a hidden ID / "Code de secours". Spec: `docs/street-addressing.md` (owner answers at its top). Final owner choices: numbers follow reading order along a street line, letters for inserts (100A, B, C; never reused), the admin traces lines when none exists (OSM bulk import deferred); lookup is Google-style (location and directions only, no personal info; only public/business places show info; non-public places answer identically for unknown addresses); street names unique within 2 km, one language, type words (rue/avenue) translated; admin fixes names, a street with 5+ houses auto-accepts the proposer's name; new server-only secret `ADMIN_TOKEN` approved.
- Usage lesson: two Opus agents plus a 195k context hit the 5h limit (agent killed by a 429). Check `/jarvis:usage` before Opus or parallel agents (memory `feedback_monitor-usage-before-opus`).

## Next steps
1. Owner: rotate the Atlas password and set `MONGODB_URI` and `DEVICE_TOKEN_SECRET` (e.g. `openssl rand -base64 48`), and now `ADMIN_TOKEN`, in `NextJS/.env.local` and Vercel (the old `NEXT_PUBLIC_MONGODB_URI` is no longer read); restrict the Mapbox token by URL; decide on deleting `yarn.lock`; approve unused `aos` dependency and CSP `frame-src https://mega.nz` removal; 3-5 local readers for the 138-word street-noun list.
2. Build in stages, verify and commit after each, owner reviews after stage 2 (Home): (a) DONE; (b) DONE, awaiting owner review (design system + Home with the map); (c) "Y aller" sheet; (d) create flow with "Votre rue" step and success card; (e) find (street+number box), My addresses, offline; then retire legacy Address pages/API (`/api/address`, `/api/add_address`, `/api/addrequest`, `models/addressModel.js`, `requestModel.js`) and the rejected components in `components/app/`. Keep reusable pure code and tests (`utils/share.ts`, `gps.ts`, `localPlaces.ts`, `i18n/`, `components/app/use-gps.ts`, PWA files).
   Phase 0 leftover: map decision spike (Mapbox 2.x vs alternatives; free tier only). CSP untested in a real browser with a Mapbox token (map, geolocation; tighten `script-src` with nonces later).
3. `npm audit`: 9 left, all build-time (Tailwind 3 and eslint-config-next glob chain); fix = Tailwind 4 / newer eslint-config-next, not done.

## Decisions (why, not what)
- npm is the package manager: dependabot touches `package-lock.json`; yarn isn't installed on the dev machine.
- jarvis commands `cd NextJS` because the app is a subdirectory of the git root.
- Anzi is a free hobby project, zero running cost, pursued for usefulness not revenue. Stay within free tiers (Vercel Hobby, Atlas free, Mapbox 50k loads, R2, Upstash). No ads on the site (Vercel Hobby is non-commercial).
- Owner declined the 2-week validation step; marketing is organic posts/ad creatives shared in local groups. Add first-party counters (places, shares, non-owner lookups) instead.
- Competitor FindMe/CAMPOST (official postal address). Anzi lane: free, personal, landmark-first, WhatsApp-native, community street names (unofficial). Owner has no local contacts, so any pilot is partner-run (plan section 6).
- Start with Phase 0 of the plan, on a branch, not on `main`.
- Rate limits live in MongoDB (TTL collection) instead of Upstash: same free tier, no new service/account. Revisit if load grows.
- Phone numbers are left out of `Place` until encryption at rest and the "Call" opt-in flow are built.
- Vitest 5 chosen (fixes critical audit findings of v3); it forces Node >= 22.12 (CI uses 22).

## Known issues
- New screens: consent wording is a draft (plan marks it [validate]); region/city are typed by hand (no reverse geocoding); GPS accuracy over 1000 m is refused, 30/100 m thresholds are my guess; `/create`, `/find`, `/mine` are dynamic (they read the language cookie); First Load JS for the new routes not measured (Turbopack prints no size table; `/create` own chunks are about 14 kB gzip).
- Legacy `POST /api/address` is still open (no auth, no caller); goes away with the legacy model.
- `/api/places` is unit-tested with mocked models only; never run against a real MongoDB (check 2dsphere/TTL indexes build on Atlas free).
- `add_address` / `addrequest` POST accept unvalidated, unthrottled input; `description` of add_address may hold contact details returned by the public GET.
- `Address.createIndexes(...)` is still called per request, unawaited (legacy model, to be replaced).
- Two tracked lockfiles (`yarn.lock` stale, `package-lock.json` real). `map.tsx` still uses `window.location.href` (1 lint warning).
- `NextJS/README.md` and `CHANGELOG.md` are the unmodified Cruip template. Root `notes` and `perspective` are scratch files.

## Architecture map
- `NextJS/app/(pages)/api/<name>/route.ts` + `<name>_controller.js` → HTTP handlers and logic
- `NextJS/models/*.js` → Mongoose schemas (address, request)
- `NextJS/utils/connectMongo.js` → cached Mongo connection
- `NextJS/components/map.tsx` → Mapbox map and geocoder
- `NextJS/server.mjs` → custom dev server (port 3000)

## History (compact, newest first)
- 2026-10-11: scaffolded with jarvis 0.5.0; commands verified. Added project rules (`.claude/rules/`), skills (`new-endpoint`, `mobile-check`), hook `.claude/hooks/anzi-guard.sh`, guard entries in `jarvis.json`. Reviewed code (`docs/review-2026-10.md`), wrote the refresh plan (`docs/refresh-plan.md`) and verified market/legal/cost facts (`docs/research-2026-10.md`). Nothing committed; no app code changed yet.
