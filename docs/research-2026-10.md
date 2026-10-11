# Research notes — verification of plan assumptions (2026-10-11)

Gathered by web research. **V** = page fetched and read; **S** = search snippet only; **U** = unverified. Secondary sources conflict in places; this is not legal advice. Confirm the legal points with a Cameroonian lawyer before launch.

## 1. Legal
| Point | Finding | Conf. | Source |
|---|---|---|---|
| Who names streets | Communes. Law 2019/024 (Code des CTD) art. 158 lists "adressage et dénomination des rues" as a communal competence; art. 168: the municipal council deliberates on street names; art. 241(3): same for urban communities | V (council-site copy) | limbe.cm, Livre 3 of the Code |
| National toponymy body | Decree 68/DF/314 (1968) created a commission, reportedly never operational; no toponymy legislation | S | UN GEGN 2021 paper |
| Ban on unofficial names in a private app | None found (absence of evidence) | U | — |
| Digital addressing law | MINPOSTEL's 2021 tender says ~85% of Cameroonians have no physical address and calls for a draft text on digital addressing, so none existed then | V | armp.cm (AMI 2642) |
| Data protection law | **Law 2024/017 of 23 Dec 2024**; creates the APDP authority (art. 53); compliance deadline 23 June 2026 (art. 73) | V (secondary) | digitalbusiness.africa, droitmediasfinance.com |
| APDP status | Not operational as of July 2026, organising decree unpublished, sanctions "suspended" | S-V (one NGO page) | obs-cc.org |
| Consent | Explicit, free, informed, withdrawable, before collection; minors under 18 need parental consent (art. 9) | V (secondary) | TechHive Advisory |
| Authorisation | Prior APDP authorisation for processing (art. 19) and for transfers abroad (art. 32); no general declaration regime found | V (secondary) | TechHive |
| Rights | Access, rectification, erasure, opposition (arts. 37-44, 46); records of processing (29); DPIA (33); breach notice | V (secondary) | TechHive |
| Penalties | Conflicting: 100 M FCFA / up to 10 years vs up to 1 bn FCFA | U | — |
| Geolocation | No specific rule found; listed only as an example of personal data | U | — |
| Foreign-hosted apps | Unclear whether the law applies; one source says no extraterritorial reach | U | — |
| Cybersecurity law 2010/012 | Art. 34: host not liable for user content if unaware or if it acts promptly after notice. Art. 35 and 46: keep contributor-identifying data and stored content for 10 years. Art. 43: provider liable for content harming dignity, honour, privacy | V (official PDF) | minpostel.gov.cm Loi 2010-012 |
| Mapping rules | INC (national cartography) exists; drones need CCAA authorisation ≥ 30 days ahead. No rule found on publishing coordinates or crowd-sourced points | S / U | minresi.gov.cm, ccaa.aero |

**Tension to resolve with counsel:** erasure rights (deleting a place) versus the 10-year contributor-log duties. Proposed design: keep the public place record separate from a minimal contributor log (device token, timestamps, IP) so a place can be deleted while the log is retained if required.

## 2. Addressing landscape
- **Direct competitor: FindMe** (CEO Brandon Wanguep). CAMPOST (state postal operator) partnership signed 2024-11-01 for a national address registry; CCA Bank + Campost + FindMe agreement 2025-06-17 (KYC use). Digital address (house no., street, postal code, city) in about 2 minutes, linked to Google Maps/Waze. FindMe's site lists a "Plan de Localisation Postale" at 2,000 FCFA (household) and 5,000 FCFA (business); press reports a free basic address with a paid certified one. Claimed ~15,000 addresses vs a 100,000 target for end 2025; **2026 traction not found**. (V: businessincameroon.com 0411-14292, ecomatin.net, adresse-findme.house)
- **Yaoundé commune:** addressing relaunched 2015-16 with AIMF; reports of 130-150 streets named, 10,000 plates in production; later figures unconfirmed (V/S: camer.be). Official numbering is partial and slow.
- **MIT Media Lab "Addressing Cameroon":** OSM-based pilot in Bonamoussadi (Douala) and Fotouni with IUC Douala (V: media.mit.edu). A possible research ally.
- **Google:** Plus Codes exist for places without street addresses (V: support.google.com/maps/answer/7047426). Cameroon has no Street View (V: Wikipedia). what3words is free for individuals, paid API; no Cameroon partnership found.
- **OpenStreetMap:** Yaoundé and Douala mostly mapped (old wiki). UN Maps externship, Yaoundé, Apr-May 2026: 86,119 edits, 70,633 buildings, 1,832 km roads, ~550 field POIs at Univ. Yaoundé I; second cohort planned (V: maps.un.org). Buea/Bafoussam quality: U.
- **Delivery:** Yango (Yaoundé, Douala since 2021) planning food/grocery delivery in Yaoundé, Douala, Bafoussam in 2026 (V: itweb.africa). Jumia left in 2019 (S). Local couriers such as K Delivery Service serve main roads and side streets only on request (S). The assumption that riders navigate by WhatsApp pins and phone calls is **widely believed but unsourced**; validate in interviews.
- **Communities reachable remotely:** OSM Cameroun (talk-cm list, Facebook), GeOSM Family and UN Maps ambassador for Cameroon (via UN Maps "Contact us"), YouthMappers chapters (Mbalmayo, Douala), ActivSpaces (Buea, Douala), Jongo Hub (Buea), Innova237 (Douala), MountainHub (Buea). Contact data may be stale.

## 3. Users and channels
- Internet: 12.6 M users, **41.9% penetration** (Oct 2025), 58% offline; 29.0 M mobile connections; 60.6% urban; median age 18 (V: DataReportal Digital 2026).
- Devices: Android **83.3%** of mobile OS (Sept 2026); Chrome **80.5%**, Safari 13.2%, Opera 3.9%, Samsung 1.3%, UC 0.5% (V: StatCounter).
- Data cost: 5 GB costs 5.72% of GNI per capita (ITU 2025, via Ecofin). 2026 per-GB prices: not found.
- Disruption: whole-country internet blackout around the Oct 2025 protests (S: africanews); 94-day North-West/South-West cut in 2017 (S).
- Language: Anglophones ~14% (UN-Habitat) to ~20% (RFI, BBC); adult literacy 78%; youth urban 92% vs rural 71% (S: INS). Pidgin ~12 M speakers; online use: U.
- Platforms: Facebook ad reach 5.9 M (19.6%), 59% male (V: DataReportal). Facebook ~83% of social referral traffic (V: StatCounter). Douala/Yaoundé survey: 86% on a social network, Facebook then TikTok then Instagram (S: Médiamétrie). WhatsApp: only small-sample data (S). TikTok/WhatsApp reach figures: not found.
- Mobile money: 11.4 M active MTN/Orange subscriptions in 2024 (S: businessincameroon). Fees and limits: U.
- Remote-pilot precedent: UN Maps Yaoundé externship (above), run by a local ambassador with online and in-person participants (V). No documented remote addressing or delivery launch found.

## 4. Hosting, maps, storage (vendor pages, 2026-10-11)
- **Vercel Hobby:** "restricted to non-commercial personal use only"; donations are not commercial; Pro $20/month (V: vercel.com/docs/limits/fair-use-guidelines, dated 2026-09-14). Hobby limits include 100 GB transfer and 1 M function invocations.
- **MongoDB Atlas free:** 0.5 GB, 500 connections, 100 ops/s, no backups, pauses after 30 days idle; Cape Town (af-south-1) and EU regions are listed, free-tier availability per region unconfirmed; 2dsphere support not positively confirmed (V/U).
- **Maps:** Mapbox GL JS 50,000 free map loads/month, public tokens can be URL-restricted; MapLibre GL JS is BSD-3; MapTiler Free is non-commercial with a logo; Stadia Free is non-commercial and has no satellite; Protomaps/PMTiles can be self-hosted on R2; OSM standard tiles allowed for apps but heavy use, bulk and offline prefetching are prohibited (V). **A satellite layer with licence terms covering this use in Cameroon was not confirmed on any free tier.**
- **Storage:** Cloudflare R2 10 GB free and free egress; Cloudinary free 25 credits/month; Vercel Blob Hobby 1 GB; Backblaze B2 10 GB free (V; B2 page may be stale).
- **Anti-abuse:** Upstash Redis free 500 K commands/month; Cloudflare Turnstile free (V).
- **Google Maps URLs:** no API key needed; formats `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving` and `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`; `api=1` is mandatory; travelmode accepts driving, walking, bicycling, two-wheeler, transit; 2,048-character limit (V: developers.google.com/maps/documentation/urls). Cost statement not in the docs. Plus Codes are confirmed for the Maps search box, not for the `query=` parameter. open-location-code is Apache-2.0.
- **Next.js:** latest stable major is 16 (Active LTS); 15 is Maintenance LTS; 14 and older are end of life (V: nextjs.org/support-policy). Needs Node 20.9+.

## 5. Corrections to `docs/refresh-plan.md`
1. Anzi has a direct competitor (FindMe + CAMPOST). Positioning must be free, personal, landmark-first, WhatsApp-native, not "the national address".
2. Streets are legally a commune competence; Anzi names stay unofficial community names.
3. Consent, deletion, minors, and cross-border hosting need explicit design (see plan section 1).
4. Satellite toggle is not assured; check imagery licensing before promising it.
5. "Free" for Google Maps links is not documented; "no API key" is.
6. Upgrade target is Next.js 16 (Next 15 is only in maintenance).
7. A founder-run neighbourhood pilot is replaced by a partner-run, remote-friendly pilot (plan section 6).
