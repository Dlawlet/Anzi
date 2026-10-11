'use client'

import { useState } from 'react'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { buildShareText, mapsNavigateUrl, mapsViewUrl, whatsappUrl } from '@/utils/share'
import { SITE_URL } from '@/utils/site'
import { CopyIcon, NavigateIcon, ShareIcon } from './icons'
import { primaryButton, secondaryButton } from './ui-classes'

// Share and Google Maps buttons under an address card. The owner leads with sharing, a visitor with navigating.
export default function PlaceActions({ place, t, lead }: { place: PlaceView; t: Dict; lead: 'share' | 'navigate' }) {
  const [copied, setCopied] = useState(false)

  const shareText = buildShareText(
    place,
    { code: t.share.code, landmark: t.share.landmark, street: t.card.street, unnamed: t.card.unnamed, houseNo: t.card.houseNo },
    SITE_URL
  )

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(place.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked; the code is on screen anyway.
    }
  }

  const share = (
    <a key="share" href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer" className={lead === 'share' ? primaryButton : secondaryButton}>
      <ShareIcon className="h-6 w-6" />
      {t.common.whatsapp}
    </a>
  )
  const maps = (
    <a
      key="maps"
      href={lead === 'navigate' ? mapsNavigateUrl(place) : mapsViewUrl(place)}
      target="_blank"
      rel="noopener noreferrer"
      className={lead === 'navigate' ? primaryButton : secondaryButton}
    >
      <NavigateIcon className="h-6 w-6" />
      {lead === 'navigate' ? t.common.navigate : t.common.openMaps}
    </a>
  )

  return (
    <div className="flex flex-col gap-2">
      {lead === 'share' ? [share, maps] : [maps, share]}
      <button type="button" onClick={copyCode} className={secondaryButton}>
        <CopyIcon className="h-6 w-6" />
        {copied ? t.common.copied : t.common.copy}
      </button>
      <p role="status" className="sr-only">{copied ? t.common.copied : ''}</p>
    </div>
  )
}
