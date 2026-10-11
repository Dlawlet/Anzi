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
- CI: `.github/workflows/ci.yml` (lint, tsc, test, build on Node 22).

## Next steps
1. Owner: rotate the Atlas password and set `MONGODB_URI` and `DEVICE_TOKEN_SECRET` (e.g. `openssl rand -base64 48`) in Vercel (the old `NEXT_PUBLIC_MONGODB_URI` is no longer read); restrict the Mapbox token by URL; decide on deleting `yarn.lock` (Vercel may pick it over `package-lock.json`).
2. Phase 1 next (in order): new home at `/` (search box, two big buttons, My addresses; today the landing and header still link only to legacy pages, so the new screens are reachable by URL only), PWA manifest + offline shell, "Save as image" card, edit name/landmark on My addresses, mini-map pin nudge, test with 5 non-technical people (wording, consent text needs a lawyer: bump `CONSENT_VERSION` if it changes); then retire legacy Address pages/API (`/api/address`, `/api/add_address`, `/api/addrequest`, `models/addressModel.js`, `requestModel.js`). Not yet in `Place`: street, photo, contact phone (encrypt at rest), duplicate-nearby warning, report endpoint.
   Phase 0 leftover: map decision spike (Mapbox 2.x vs alternatives; free tier only). CSP is in `next.config.js` but untested in a real browser with a Mapbox token (check map, geolocation, hero Mega iframe; tighten `script-src` with nonces later).
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
- Hero modal still embeds a Mega.nz iframe.

## Architecture map
- `NextJS/app/(pages)/api/<name>/route.ts` + `<name>_controller.js` → HTTP handlers and logic
- `NextJS/models/*.js` → Mongoose schemas (address, request)
- `NextJS/utils/connectMongo.js` → cached Mongo connection
- `NextJS/components/map.tsx` → Mapbox map and geocoder
- `NextJS/server.mjs` → custom dev server (port 3000)

## History (compact, newest first)
- 2026-10-11: scaffolded with jarvis 0.5.0; commands verified. Added project rules (`.claude/rules/`), skills (`new-endpoint`, `mobile-check`), hook `.claude/hooks/anzi-guard.sh`, guard entries in `jarvis.json`. Reviewed code (`docs/review-2026-10.md`), wrote the refresh plan (`docs/refresh-plan.md`) and verified market/legal/cost facts (`docs/research-2026-10.md`). Nothing committed; no app code changed yet.
