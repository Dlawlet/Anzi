# Status — anzi

> Living memory of the project. Read at session start (first lines are auto-injected). Keep it short: summarise, don't append forever.

## Goal
Anzi: Next.js app where users view a map of addresses (Mapbox), and submit new addresses or address requests. Backed by MongoDB via Mongoose. Kind: poc.

## Current state (2026-10-11)
- Branch `chore/refresh-foundations` (not merged): Phase 0 items done except the leftovers listed in Next steps. Next 16.4, React 19, mongoose 9, sharp 0.35, ESLint 9 (flat config, `eslint .`), Vitest 3->5 (needs Node >= 22.12). Plain `npm ci` passes; lint, `tsc`, 13 tests and `next build` pass.
- DB URI is now `MONGODB_URI` (server-only). Local `.next` had no URI, but it was built without env, so it proves nothing about the deployed bundle; only server `route.ts` files import `connectMongo`, so a leak is unlikely. Rotating the password is still the owner's action.
- Security fixes: place names rendered as text (popup, geocoder suggestions); `/api/address` validates id/coordinates, escapes the search regex, caps length, returns generic errors. Regression tests in `utils/validate.test.js` and `address_controller.test.js`.
- Removed: auth pages, testimonials, blocks, newsletter and `/api/mailing` (+ model), directions plugin, unused images and video, dead PUT/DELETE stubs. Landing (hero, features, zigzag, footer) and the three form pages remain until Phase 1.
- CI: `.github/workflows/ci.yml` (lint, tsc, test, build on Node 22).

## Next steps
1. Owner: rotate the Atlas password and set `MONGODB_URI` in Vercel (the old `NEXT_PUBLIC_MONGODB_URI` is no longer read); restrict the Mapbox token by URL; decide on deleting `yarn.lock` (Vercel may pick it over `package-lock.json`).
2. Rest of Phase 0: security headers + CSP in `next.config.js`, map decision spike. Then Phase 1 (`Place` model, device-token identity, rate limits) which also closes the open-write issue (no authn on PUT/DELETE `/api/address`).
3. `npm audit`: 9 left, all build-time (Tailwind 3 and eslint-config-next glob chain); fix = Tailwind 4 / newer eslint-config-next, not done.

## Decisions (why, not what)
- npm is the package manager: dependabot touches `package-lock.json`; yarn isn't installed on the dev machine.
- jarvis commands `cd NextJS` because the app is a subdirectory of the git root.
- Anzi is a free hobby project, zero running cost, pursued for usefulness not revenue. Stay within free tiers (Vercel Hobby, Atlas free, Mapbox 50k loads, R2, Upstash). No ads on the site (Vercel Hobby is non-commercial).
- Owner declined the 2-week validation step; marketing is organic posts/ad creatives shared in local groups. Add first-party counters (places, shares, non-owner lookups) instead.
- Competitor FindMe/CAMPOST (official postal address). Anzi lane: free, personal, landmark-first, WhatsApp-native, community street names (unofficial). Owner has no local contacts, so any pilot is partner-run (plan section 6).
- Start with Phase 0 of the plan, on a branch, not on `main`.

## Known issues
- `PUT`/`DELETE` `/api/address` still have no authn/authz (Phase 1).
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
