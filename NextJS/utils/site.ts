// The one place the public site address is read. It stays empty (and is left out of UI and share text)
// until a custom domain exists; *.vercel.app is refused on purpose.
export function publicSiteUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (url.hostname === 'vercel.app' || url.hostname.endsWith('.vercel.app')) return null
    return url.origin
  } catch {
    return null
  }
}

// Written out in full so Next inlines the value into the client bundle.
export const SITE_URL = publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
