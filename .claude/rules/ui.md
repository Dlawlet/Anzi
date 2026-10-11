---
paths:
  - NextJS/components/**
  - NextJS/app/**/*.tsx
  - NextJS/app/css/**
---
# UI rules (new or changed code)

- Mobile first: design at 360x640, then scale up. Touch targets >= 44px. Body text >= 16px (smaller causes zoom on iOS inputs).
- Audience is non-technical and often on slow data: one primary action per screen, plain words, icons with labels, no jargon ("street number", not "localization").
- All user-facing strings come from the FR/EN dictionary (French default). No hardcoded copy in components once i18n exists.
- Server components by default. `"use client"` only for what needs state or browser APIs; never at layout level. Load the map lazily (dynamic import, `ssr: false`), only on map routes.
- Budgets: non-map routes < 100 kB first-load JS; images < 100 kB (webp/avif via `next/image`); no autoplaying or embedded video on first load.
- User-supplied text (place and street names, landmarks) is rendered as text, never as HTML.
- Every form: visible label (not placeholder-only), inline error in plain language, loading state, success screen that says what happens next.
- Do not display the site URL or QR codes in UI or share text until a custom domain exists; read the base URL from one constant (`NEXT_PUBLIC_SITE_URL`) so it can change in one place.
- Contrast >= 4.5:1 for text. Check both the light and any dark theme.
