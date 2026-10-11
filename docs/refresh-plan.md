# Anzi refresh plan

Status: proposal, revised 2026-10-11 after web research (`docs/research-2026-10.md`, with sources and confidence levels). Everything marked **[decide]** needs the owner's call. **[validate]** now means "could not be verified online; check with real users or a local lawyer". Legal points are not legal advice.

## 0. Reality check

Anzi has not reached its users in 3 years. The code is not the main reason: an address system only has value when other people can **find** places with it, so it is useless at 5 addresses and useful at 150 in one neighbourhood. The plan therefore has two tracks that run together:

- **Build** a very small product that does three jobs well (below).
- **Launch hyperlocal**: one neighbourhood, a few ambassadors, real delivery trials. Not a national launch.

Success is measured by one number: **lookups made by someone other than the owner** (a rider, a friend, a customer finding a place with Anzi). Registrations alone are a vanity metric.

## 1. Product

### The three jobs
1. **"Create my address"** (owner): in under 60 seconds, on a phone, get a permanent code and a shareable card.
2. **"Find an address"** (visitor, rider, customer): type or paste a code or a name, see the place, open it in Google Maps in one tap.
3. **"Name my street"** (first person on an unnamed street): propose a name; neighbours confirm.

Everything else (accounts, newsletter, landing sections, directions UI) is cut or postponed.

### What an Anzi address is
`Place name · house number · street · quarter · city` plus a short code and a landmark.

- **Anzi code**: `YDE-7K4M` = city prefix + 4-5 characters from an unambiguous alphabet (no 0/O, 1/I/L). Short enough to say over the phone or type in WhatsApp. Works even when the street has no name. **[decide]** prefix scheme.
- **Landmark ("repère")**: free text such as "behind the pharmacy, yellow gate". In practice this is how directions are given locally, so it is a first-class field, not an afterthought. **[validate]**
- **Photo of the gate/entrance** (optional, compressed on the device): strongest help for a rider on the last 50 m.
- **Plus Code** (Open Location Code, open standard, Google Maps search accepts it): computed from the coordinates and shown next to the Anzi code. It is the bridge to Google Maps and a fallback if Anzi is down.

### Competition (verified)
- **FindMe**, partnered with CAMPOST (the state postal operator, Nov 2024) and CCA Bank (Jun 2025): a digital postal address (house number, street, postcode, city) linked to Google Maps/Waze. Its site lists a certified "Plan de Localisation Postale" at 2,000 FCFA (households) and 5,000 FCFA (businesses). It claimed about 15,000 addresses against a 100,000 target; I could not find 2026 traction. It is the incumbent for the **official/postal** address.
- Plus Codes (free, for places without a street address) and what3words (free for individuals) solve "address from coordinates" but have no local names, landmarks or community.
- Official street naming by the Yaoundé commune is partial (reports of 130-150 streets named, 10,000 plates in production, older figures).
- **Anzi's lane:** free, personal, landmark-first, community-named, WhatsApp-native; a way to be found **today**, not an official postal identity. Do not compete on "official". **[decide]** whether to stay independent or later offer an optional field for a FindMe/CAMPOST reference; check FindMe's real traction before finalising positioning.
- Google has no Street View in Cameroon, so the landmark sentence and the gate photo are Anzi's substitute for street-level imagery.

### Privacy defaults (important: a home location is sensitive)
- `visibility`: **link-only** by default (found only by exact code, never listed or searchable by name). **public** is opt-in, intended for businesses. **private** = only the owner.
- Phone/email are never in public responses. A visitor sees a "Call" button only if the owner enabled it.
- Owner can edit, hide or delete a place at any time.
- **Law 2024/017 on personal data protection (23 Dec 2024)** is real; its compliance deadline was 23 June 2026. Consequences for design:
  - explicit, informed consent **before** collection, withdrawable (store `consentAt` and `consentVersion` on each place); a short plain-language FR/EN consent screen, not buried in terms;
  - under 18 requires parental consent: add an "I am 18+ or have a parent's OK" check;
  - access, correction, deletion and objection rights: "My data" screen with delete and export;
  - data-protection authority (APDP) authorisation is required for processing and for transfers abroad, but as of mid-2026 the APDP was reported **not yet operational**, and whether the law reaches a foreign-hosted app is unclear. **[validate]** with a Cameroonian lawyer before launch; until then keep data minimal and say so.
- The 2010 cybersecurity law makes a host liable for user content it knows is unlawful and does not remove promptly, and asks hosts to keep contributor-identifying data for 10 years. Design: a report/takedown button with a visible response process; keep a minimal contributor log (device token, timestamps, IP) **separate** from the public place record so a place can be deleted while the log is retained if the law requires it. **[validate]** with counsel.
- Exact home GPS and phone numbers are the highest-risk fields: encrypt the phone at rest, never log either.

### Street naming rules (proposal)
- A **Street** is a community entity, not an official one. Under Law 2019/024 (Code des collectivités territoriales décentralisées, arts. 158 and 168) naming streets is a **communal competence** decided by the municipal council. I found no rule forbidding a private app from showing unofficial names, but label them "community name", never present them as official, and let an official commune name override a community name when one is known. Approach the Yaoundé and Douala urban communities as partners rather than rivals once there is traction.
- When registering, the user sees streets already known within ~150 m ("Rue X, 6 places") and picks one, or chooses "My street has no name", or "I don't know".
- The first registrant on an unnamed street can propose a name (optional, skippable). Status: `unnamed -> proposed -> accepted`.
- `accepted` when at least 3 distinct neighbours on that street confirm and no competing proposal has more confirmations. Ties and reports go to a moderator.
- Moderation: name filter (no insults), report button, admin queue. Start with the owner as the only moderator.
- Optional seed: pre-fill named roads from OpenStreetMap where they exist, so users do not rename a street that already has a name. **[decide]**

### Google Maps handoff (no paid API needed)
Plain links that need no API key (Google's docs state this; they do not state a price, so treat "free" as probable, not guaranteed). `api=1` is mandatory; `travelmode` accepts driving, walking, bicycling, **two-wheeler** and transit (relevant for moto-taxis); URL limit 2,048 characters:
- Navigate: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving`
- Show on map: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`
- "Open with..." sheet: Google Maps (default), Waze, Apple Maps (iOS; iOS is only about 17% of mobile there), "Copy coordinates", "Copy Plus Code" (Plus Codes are confirmed for the Maps search box, not for the link parameter, so use coordinates in links).
- Import (later): paste a Google Maps link or Plus Code when creating a place; resolve short `maps.app.goo.gl` links server-side.
The homemade Mapbox directions widget is **removed**. Also removes the `npm ci` peer conflict.

### Sharing without showing the site URL
- Primary share is **WhatsApp** (`https://wa.me/?text=...`) and "Save as image".
- Share text leads with the name, code and landmark, followed by the Google Maps link; the Anzi link goes last and comes from a single constant (`NEXT_PUBLIC_SITE_URL`), so it can be switched off now and swapped to a custom domain later with one change.
- The shareable **address card** (image) shows the name, code, landmark and the Anzi logo, no URL, no QR.
- **Installable PWA** ("Add to home screen"): users reach Anzi by an icon, so the vercel.app address is never seen.

## 2. Data model (replaces `Address` / `Request` / `Mailing`)

```
Place {
  code            String, unique, indexed        // "YDE-7K4M"
  location        { type:"Point", coordinates:[lng,lat] }   // 2dsphere index
  accuracyM       Number                         // GPS accuracy at capture
  name            String                         // "Chez Mama Julie"
  category        enum  home|shop|salon|restaurant|office|other
  houseNumber     String (optional)
  streetId        ObjectId -> Street (nullable)
  quarter, city   String; region enum (10 regions)
  landmark        String (<= 140 chars)
  photoUrl        String (optional)
  visibility      enum  private|link|public      // default link
  consentAt, consentVersion, adultOrParentOk       // data-protection consent
  referrerCode    String (optional)              // which ambassador/partner brought this place
  contactPhone    String (optional, never public unless enabled)
  status          enum  live|pending|hidden      // set by server only
  ownerId         String                         // device token, see below
  createdAt, updatedAt
}
Street {
  name (nullable), nameStatus enum unnamed|proposed|accepted,
  proposals [{ name, byOwnerId, confirmations:[ownerId], createdAt }],
  quarter, city, firstOwnerId, placeCount, createdAt
}
Report { targetType, targetId, reason, createdAt }     // moderation
```
Rules: validators on every field (no defaults that hide missing data), indexes declared in the schema, coordinates restricted to a Cameroon bounding box plus margin, duplicate warning when another place with a similar name is within ~15 m.

**Identity**: no account to create a place. A random device token (signed, in an httpOnly cookie) marks the owner and allows edits. Optional phone verification later for recovery and for confirming street names. **[decide]** OTP channel (SMS vs WhatsApp) after checking cost and reliability locally.

**Abuse control**: per-device and per-IP rate limits, daily caps, report button, admin hide. CAPTCHA only if abuse appears.

## 3. Map

- The map is **optional on the critical path**: "Use my position" captures coordinates without rendering a map; the map is only for confirming or nudging the pin.
- Load the map lazily and only on routes that need it. Keep it out of the landing page.
- A **satellite** toggle would help users recognise their roof, but no free tier with confirmed licence terms and usable Cameroon imagery was found (MapTiler Free and Stadia Free are non-commercial; Stadia has no satellite on free). Keep it as a spike item; Phase 1 ships without it if imagery cost or licence is unclear. **[decide]**
- Search by code first, then by name; debounce 300 ms; limit results; URL-encode.
- Lookup is "closest places within a radius that grows with GPS accuracy", not an exact 7 m click.
- Decision spike, 2 days, on a real low-end Android phone on 3G/4G **[decide]**. Verified facts: Mapbox GL JS gives 50,000 free map loads/month with URL-restrictable public tokens (enough for a pilot); MapLibre GL JS is BSD-licensed and free; self-hosted Protomaps/PMTiles on Cloudflare R2 (10 GB, free egress) avoids per-load fees; the OSM standard tile server may not be used for heavy or offline-prefetch traffic. Recommended path: keep Mapbox for the pilot (token already exists, same API family), write the map code against MapLibre-compatible APIs, and move to PMTiles on R2 if traffic grows. Mobile Chrome is about 80% of browsers and Opera/UC about 4-5%, so the WebGL risk is small; still keep the no-map text fallback.
- If WebGL is unavailable, fall back to the text mode (code, name, landmark, "Open in Google Maps").

## 4. UX and visual design

### Information architecture
Home has a search box, two large buttons ("Create my address", "Find an address") and a "My addresses" list from the device. A bottom bar with three items (Find, Create, Mine) on phones. No sign-in, no marketing sections above the actions.

### Create flow (target: 4 screens, under 60 s)
1. **Where are you?** One button: "Use my position". Shows accuracy and advice if weak ("go outside / near a window"). Mini-map to nudge the pin.
2. **What is this place?** Category chips (icons), name, optional photo.
3. **Your street.** Pick a known street / "no name" / "don't know"; house number and landmark. If first on an unnamed street: "You are the first here. Give your street a name?" (skippable).
4. **Done.** The address card with the code. Buttons: Share on WhatsApp, Save image, Open in Google Maps. Explains what happens next ("Share this with anyone who needs to find you").

### Find flow
Type or paste a code or a name -> result card (name, landmark, photo, distance if location allowed) -> **Navigate** (Google Maps) | **Call** (if allowed) | **Share**.

### Principles
- **French default, English toggle, remembered per device.** Anglophones are roughly 14-20% of the population (sources differ), concentrated in the North-West and South-West; default to English when the browser language or location (Buea, Bamenda) says so. Adult literacy is about 78%, so use icon plus label, short sentences, and a short audio/voice hint on the create flow. Pidgin: later, as audio only. Test wording with 5 non-technical people. **[validate]**
- **Offline-tolerant**: a national internet blackout happened in Oct 2025, data is expensive (5 GB is about 5.7% of GNI per capita), and 58% of the population is offline. "My addresses" and the address card must work with no connection once saved.
- One primary action per screen, large tap targets (>= 44 px), body text >= 16 px.
- Every form error in plain language, with a loading state and a success screen. No `alert()`.
- Works on weak connections: lightweight pages, lazy map, offline "My address" card saved on the device.
- Sunlight readability: light theme by default, high contrast.

### Visual direction
Warm, friendly, trustworthy; not "tech startup dark purple". Light background, one strong primary colour (green for "go/trust"), a warm accent (yellow/orange) for pins and highlights, red only for errors. The pin-house is the logo mark. Real photos of local streets and people over stock illustrations. System or already self-hosted font, two weights. Design the home, create flow, result card and address card first (4 screens), then everything else. **[decide]** brand colours after seeing two mock-ups.

### Budgets (enforced by the `mobile-check` skill and the hooks)
Non-map routes < 100 kB first-load JS; map route < 250 kB; every image < 100-150 kB (webp/avif); no video on first load; target LCP under 3 s on slow 4G on a mid-range Android.

## 5. Tech plan

Sizes: S = a day or two, M = about a week, L = two weeks or more (one developer, part time). Each phase ends with a demo and `verify` green.

**Phase 0 — Foundations (M)**
- Check the deployed bundle for the DB URI; rename to `MONGODB_URI`; rotate the password; restrict the Mapbox token by URL.
- Upgrade to **Next.js 16** (Active LTS; 15 is maintenance only; 14 and older are end of life; needs Node 20.9+), plus React, mongoose, sharp; run `npm audit`. Remove `@mapbox/mapbox-gl-directions`. Drop `yarn.lock`.
- Delete dead code and template leftovers: auth pages, testimonials, blocks, unused images and video, newsletter, dead API handlers.
- Add `.env` to `.gitignore`; security headers and CSP.
- Test runner (Vitest) + GitHub Actions running lint, typecheck, test, build. Fill `commands.test` in `.claude/jarvis.json`.
- Map decision spike (above).

**Phase 1 — "Create and share my address" MVP (L)**
- New `Place` model and API (validated, rate limited, paginated, privacy-aware), device-token identity.
- Create flow, find flow, address card, WhatsApp share, Google Maps handoff, Plus Code.
- FR/EN dictionary, PWA manifest and service worker, offline "My addresses".
- Mobile-first home and map; performance budgets met.
- Exit: 10 people outside your circle create an address unaided in under 2 minutes.

**Phase 2 — Streets and community (M-L)**
- `Street` entity, nearby-street picker, naming proposal, neighbour confirmation, reports.
- Minimal admin page (protected) for moderation.
- Optional OSM seed; optional phone verification.

**Phase 3 — Pilot (runs from Phase 1 on)** see section 6.

**Phase 4 — Only if there is traction**
Business pages and verified badge, import from Google Maps, API for delivery companies, custom domain, more languages, analytics dashboard.

Hosting (verified 2026-10-11): Vercel **Hobby is restricted to non-commercial personal use** (donations are allowed; payments, ads, or being paid to build/host are commercial); Pro is $20/month. A free pilot with no revenue fits Hobby; move to Pro or another host before charging anyone or showing ads. MongoDB Atlas free tier: 0.5 GB, 500 connections, no backups, pauses after 30 days idle; choose a nearby region (Cape Town or Paris/Frankfurt) and confirm 2dsphere works on the free cluster when creating it. Photos: Cloudflare R2 (10 GB, free egress). Rate limiting: Upstash Redis free; bot protection: Cloudflare Turnstile free. Storing and processing data outside Cameroon is relevant to the data-protection law (section 1).

## 6. Marketing and launch

### Positioning
For people who struggle to explain where they live or work: Anzi gives your home or shop a free address you can say or send in one WhatsApp message, with a landmark a rider can read out. Not "a map app", and not the official postal address (that lane belongs to FindMe/CAMPOST).
French taglines to test (not final): « Ton adresse, enfin. » · « Dis où tu es, une fois pour toutes. » · « Ton quartier a enfin des adresses. » **[validate]**

### Who first
1. Home businesses that need to be found: salons, restaurants, shops, tailors, pharmacies.
2. Online sellers on WhatsApp/Facebook who explain delivery spots all day (the only segment that does not depend on one neighbourhood).
3. Riders, couriers and drivers: not customers but the people who prove it works. Yango is planning food/grocery delivery in Yaoundé, Douala and Bafoussam in 2026, which will raise demand for clear delivery points.
4. Later: diaspora sending packages to family.
Assumption to test in interviews: riders today navigate by WhatsApp pins and phone calls. This is widely believed but I found no source. **[validate]**

### Pilot without anyone on the ground
You are not in the neighbourhood and have no contact there, so the pilot is **partner-run and remote-friendly** rather than founder-run:

1. **Step 0 — Validate before building more (2 weeks, about zero cost).** Post one short question in 3-5 Yaoundé/Douala/Buea Facebook and WhatsApp groups (city buy-and-sell, student, neighbourhood groups): "How do you give your address to a delivery rider?" Run 10 short WhatsApp or phone interviews with sellers and riders; give airtime or mobile money as thanks. Output: the real wording people use, whether the landmark-first idea resonates, and whether they know FindMe.
2. **Pick a bounded place, not a free-roaming neighbourhood.** A university campus and its surroundings (shops, food stalls, student housing) is small, dense, smartphone-heavy and easy to cover. The UN Maps externship in Yaoundé (Apr-May 2026) already mapped about 550 POIs on the Yaoundé I campus; that mapper community can show where the real demand is. **[decide]** campus vs commercial street.
3. **Recruit local partners remotely.** Candidates (public information, may be stale; verify): the UN Maps Cameroon ambassador and GeOSM Family (via the UN Maps contact page), OSM Cameroun and YouthMappers chapters, and tech hubs such as ActivSpaces (Buea, Douala), Jongo Hub (Buea), Innova237 (Douala). Pitch: a free tool that creates addresses for local businesses, a small payment per verified place, and credit. Pay through MTN MoMo or Orange Money.
4. **Pay for verified outcomes, not signups.** Each place carries a `referrerCode`. A place counts only if it has a photo, a landmark and passes a check (second person confirms, or a non-owner lookup happened). Cap per partner per day to limit fraud.
5. **Run 10 real trials.** Ask one rider or courier (via a small courier service or a friend of a partner) to find 10 registered places using only the Anzi code and landmark; record time and calls needed. This is the proof you show next.
6. **Anglophone track (optional, later):** one Buea or Bamenda cohort via ActivSpaces/Jongo, with English-first UI, to test the language default.

Pilot goal (4-6 weeks): 100-150 verified places in one bounded area, 10 successful non-owner finds, 5 streets named with neighbours. Budget placeholder: partner payments plus airtime/MoMo for interviewees. **[decide]**

### Channels (evidence)
- **Facebook** is the dominant social platform in the traffic data (about 83% of social referrals; ad reach 5.9 M, about 59% male). Use city groups and a small targeted ad test (Yaoundé/Douala, ages 18-35) to find sellers.
- **WhatsApp** is the product channel (sharing cards, support, partner group). Reach figures are not available; only a small survey (about 98% of online 18-35) exists. **[validate]**
- **TikTok**: second to Facebook in a Douala/Yaoundé survey; short, humorous "lost rider" videos and before/after of a street getting a name.
- Skew: ads and Facebook lean male; women-run shops and salons need direct partner outreach, not only ads.
- **Physical**: a sticker or painted plate with the Anzi code on a gate works as signage and needs no URL. Test with the first 20 places.
- **Community**: neighbourhood leaders and moto-taxi associations through partners.
- Referral is built into the card: every recipient sees the Anzi name.

### Metrics (weekly)
Places created; share of places that were shared; **lookups by non-owners**; lookups that ended in "Navigate"; creation completion rate and time; streets named; reports; cost per verified place. First-party events with no personal data. **[decide]** tool.

### Money (later, not now)
Verified business listings, an API/dataset for delivery companies, sponsorship by a local brand or NGO. Do not charge individuals for their address. Any revenue also triggers the Vercel Hobby limit (section 5).

## 7. Decisions needed from the owner (in this order)
1. Run Step 0 (2 weeks of validation) before more building? Recommended yes. **[decide]**
2. Pilot place: campus or commercial street, and which city. **[decide]**
3. Stay independent of FindMe/CAMPOST, or add an optional reference field later. **[decide]**
4. Partner payments budget. **[decide]**
5. French-first with English toggle, privacy default `link-only`, code format with city prefix. **[decide]**
6. Map path after the spike; satellite only if licence and cost are clear. **[decide]**
7. A Cameroonian lawyer for data protection, hosting abroad, and the retention-versus-erasure question, before public launch. **[decide]**
