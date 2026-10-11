---
name: mobile-check
description: Check that a page or change respects Anzi's mobile and slow-data budgets (JS size per route, image weight, tap targets, map lazy loading). Use after UI changes, before declaring a screen done, or when asked about speed or mobile quality.
allowed-tools: Bash Read Grep Glob
---
# Mobile and speed check

1. Build: `cd NextJS && npm run build`. From the route table, list each route's First Load JS. Budgets: non-map routes < 100 kB, `/map` < 250 kB. Report offenders only.
2. Weight in `NextJS/public/`: `find NextJS/public -type f -size +100k`. Each hit is either unreferenced (suggest deletion, ask first) or must be compressed to webp/avif.
3. Grep the changed files for: `"use client"` at layout level, static imports of `mapbox-gl` / `maplibre-gl` / `leaflet` outside the lazy map component, `<img` instead of `next/image`, `h-5`/`w-5` on buttons (tap target), `text-xs` on body copy, hardcoded strings once i18n exists.
4. If a browser tool is available (see the browser skills), load the page at 360x640 with network throttled to slow 4G, and check: first meaningful content < 3 s, no horizontal scroll, primary action visible without scrolling, map screen usable one-handed. Otherwise say so; do not claim it was tested.
5. Report max 8 lines: route sizes vs budget, heavy assets, violations with file:line. No fixes unless asked.
