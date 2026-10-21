# Production checklist (owner steps, 2026-10-22)

Everything else is done and verified (see `status.md`). These steps need your accounts. About 20 minutes in one go.

## 1. Secrets (2 min)
Run this three times in any terminal, one value per variable (the app refuses values under 32 characters):
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
Keep one value for `DEVICE_TOKEN_SECRET`, one for `ADMIN_TOKEN` (this is your admin password, store it in a password manager). Do not reuse one for both.

## 2. Atlas (5 min)
1. cloud.mongodb.com > Database Access > edit your user > Edit Password > new password. Copy the new connection string.
2. Network Access > Add IP Address > "Allow access from anywhere" (0.0.0.0/0). Vercel has no fixed IP; the password is the protection.
3. Put the new string in `NextJS/.env.local` as `MONGODB_URI` too.

## 3. Mapbox (2 min)
account.mapbox.com > Tokens > the `pk.` token used by the app > URL restrictions: add your Vercel URL (the production one) and `http://localhost:3000`. Never use a `sk.` token.

## 4. Vercel (5 min)
Project > Settings > Environment Variables. Add for **Production** (tick Preview too):

| Name | Value |
|---|---|
| `MONGODB_URI` | the new Atlas string |
| `DEVICE_TOKEN_SECRET` | secret 1 |
| `ADMIN_TOKEN` | secret 2 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | the restricted `pk.` token |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL` | optional, only for the About contact form (otherwise messages are stored only) |

Do not set `NEXT_PUBLIC_SITE_URL` until you have a custom domain (while unset, no link is shown in share text, which is intended).

## 5. Go live
1. GitHub > Pull requests > open `chore/refresh-foundations` into `main` > Merge (or tell me "merge" and I do it). Vercel then deploys production.
2. Open the production URL on your phone and check: Home loads, "Créer" (GPS) makes an address, "Partager" opens WhatsApp, "Y aller" opens your maps app, "Mes adresses" lists it, "Nouveau téléphone ?" with the management key works.
3. Open `<production URL>/admin`, enter `ADMIN_TOKEN`, and trace the line of each new street (the queue lists streets waiting). Until you do, addresses on that street show "–" instead of a number. Plan to check the queue daily at first.

## 6. After launch
- Watch Vercel > Logs and Atlas > Metrics for the first days (free tiers: Atlas 512 MB, Mapbox 50k loads/month).
- Vercel Hobby is for non-commercial use. The afidipro.com partnership may count as commercial: check the Vercel terms before announcing it, or plan the Pro plan.
- For afidipro: once you have their spec, tell me what they need (search by street + number, create from their app, white-label...). A partner calling from a server shares one IP, so the rate limits will need a partner API key; I will add it with their spec, not before.
