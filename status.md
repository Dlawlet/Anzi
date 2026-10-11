# Status — anzi

> Living memory of the project. Read at session start (first lines are auto-injected). Keep it short: summarise, don't append forever.

## Goal
Anzi: Next.js app where users view a map of addresses (Mapbox + directions), submit new addresses or address requests, and join a mailing list. Backed by MongoDB via Mongoose. Kind: poc.

## Current state (2026-10-11)
- jarvis adopted. lint, `tsc --noEmit` and `next build` all pass on `main` (verified after `npm ci --legacy-peer-deps`).
- API routes exist for address, addrequest, add_address and mailing. Auth pages (signin/signup/reset-password) are UI only.
- No tests, no formatter.

## Next steps
1. Owner reviews `docs/refresh-plan.md` and answers section 7. Facts and sources behind it: `docs/research-2026-10.md` (competitor FindMe/CAMPOST, Law 2024/017, communes name streets, Vercel Hobby non-commercial, Next 16). No local contact for a pilot: use the partner-run pilot in plan section 6, starting with 2 weeks of validation interviews.
2. Phase 0 (see plan): bundle/DB-URI check and rotation, dependency upgrade, remove mapbox-gl-directions, delete template leftovers, add Vitest + CI, map spike.
3. Fix the security items in `docs/review-2026-10.md` (XSS, open writes, regex/JSON injection) as part of Phase 0/1, not separately on the legacy model.

## Decisions (why, not what)
- npm is the package manager: dependabot touches `package-lock.json`; yarn isn't installed on the dev machine.
- jarvis commands `cd NextJS` because the app is a subdirectory of the git root.
- Anzi is a free hobby project, zero running cost, pursued for usefulness not revenue. Stay within free tiers (Vercel Hobby, Atlas free, Mapbox 50k loads, R2, Upstash). No ads on the site (Vercel Hobby is non-commercial).
- Owner declined the 2-week validation step; marketing is organic posts/ad creatives shared in local groups. Add first-party counters (places, shares, non-owner lookups) instead.
- Competitor FindMe/CAMPOST (official postal address). Anzi lane: free, personal, landmark-first, WhatsApp-native, community street names (unofficial). Owner has no local contacts, so any pilot is partner-run (plan section 6).
- Start with Phase 0 of the plan, on a branch, not on `main`.

## Known issues
- `npm ci` fails on a peer conflict (`@mapbox/mapbox-gl-directions` wants `mapbox-gl <2`, project uses 2.15); needs `--legacy-peer-deps`.
- DB URI is read from `NEXT_PUBLIC_MONGODB_URI`: exposed to the client bundle if referenced from client code. Rename to a server-only variable.
- `server.mjs` calls `mongoose.disconnect(process.env.NEXT_PUBLIC_MONGODB_URI)`; `disconnect` takes no URI argument.
- `PUT` / `DELETE` in `api/address/route.ts` don't call `connectToDatabase()` (GET/POST do).
- Two tracked lockfiles (`yarn.lock`, `package-lock.json`) can drift.
- `NextJS/README.md` and `CHANGELOG.md` are the unmodified Cruip template. Root `notes` and `perspective` are scratch files, not docs.

## Architecture map
- `NextJS/app/(pages)/api/<name>/route.ts` + `<name>_controller.js` → HTTP handlers and logic
- `NextJS/models/*.js` → Mongoose schemas (address, mailing, request)
- `NextJS/utils/connectMongo.js` → cached Mongo connection
- `NextJS/components/map.tsx` → Mapbox map and directions widget
- `NextJS/server.mjs` → custom dev server (port 3000)

## History (compact, newest first)
- 2026-10-11: scaffolded with jarvis 0.5.0; commands verified. Added project rules (`.claude/rules/`), skills (`new-endpoint`, `mobile-check`), hook `.claude/hooks/anzi-guard.sh`, guard entries in `jarvis.json`. Reviewed code (`docs/review-2026-10.md`), wrote the refresh plan (`docs/refresh-plan.md`) and verified market/legal/cost facts (`docs/research-2026-10.md`). Nothing committed; no app code changed yet.
