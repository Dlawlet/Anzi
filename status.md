# Status — anzi

> Living memory of the project. Read at session start (first lines are auto-injected). Keep it short: summarise, don't append forever.

## Goal
Anzi: Next.js app where users view a map of addresses (Mapbox + directions), submit new addresses or address requests, and join a mailing list. Backed by MongoDB via Mongoose. Kind: poc.

## Current state (2026-10-11)
- jarvis adopted. lint, `tsc --noEmit` and `next build` all pass on `main` (verified after `npm ci --legacy-peer-deps`).
- API routes exist for address, addrequest, add_address and mailing. Auth pages (signin/signup/reset-password) are UI only.
- No tests, no formatter.

## Next steps
1. Decide what to build next (not specified yet).
2. Consider adding a test script and a formatter, then fill `test` / `format` in `.claude/jarvis.json`.

## Decisions (why, not what)
- npm is the package manager: dependabot touches `package-lock.json`; yarn isn't installed on the dev machine.
- jarvis commands `cd NextJS` because the app is a subdirectory of the git root.

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
- 2026-10-11: project scaffolded with jarvis 0.5.0; commands verified.
