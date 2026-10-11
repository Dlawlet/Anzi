'use client'

import { useCallback, useState } from 'react'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { addressLine, buildShareText, whatsappUrl } from '@/utils/share'
import { SITE_URL } from '@/utils/site'
import GoSheet from './go-sheet'
import { CopyIcon, NavigateIcon, ShareIcon } from './icons'
import { primaryButton, secondaryButton } from './ui-classes'

// Share and "Y aller" buttons under an address card. The owner leads with sharing, a visitor with navigating.
export default function PlaceActions({ place, t, lead, whatsappTone }: { place: PlaceView; t: Dict; lead: 'share' | 'navigate'; whatsappTone?: 'leaf' }) {
  const [copied, setCopied] = useState(false)
  const [goOpen, setGoOpen] = useState(false)
  const closeGo = useCallback(() => setGoOpen(false), [])

  const shareText = buildShareText(
    place,
    { code: t.share.code, landmark: t.share.landmark, street: t.card.street, unnamed: t.card.unnamed, houseNo: t.card.houseNo },
    SITE_URL
  )

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(addressLine(place, t.card) || place.name)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked; the address is on screen anyway.
    }
  }

  const share = (
    <a key="share" href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer" className={whatsappTone === 'leaf' ? 'btn bg-leaf text-white' : lead === 'share' ? primaryButton : secondaryButton}>
      <ShareIcon className="h-6 w-6" />
      {t.common.whatsapp}
    </a>
  )
  const maps = (
    <button key="maps" type="button" onClick={() => setGoOpen(true)} className={lead === 'navigate' ? primaryButton : secondaryButton}>
      <NavigateIcon className="h-6 w-6" />
      {t.go.title}
    </button>
  )

  return (
    <div className="flex flex-col gap-2">
      {lead === 'share' ? [share, maps] : [maps, share]}
      <GoSheet lat={place.lat} lng={place.lng} label={addressLine(place, t.card) || place.name} open={goOpen} onClose={closeGo} />
      <button type="button" onClick={copyAddress} className={secondaryButton}>
        <CopyIcon className="h-6 w-6" />
        {copied ? t.common.copied : t.common.copy}
      </button>
      <p role="status" className="sr-only">{copied ? t.common.copied : ''}</p>
    </div>
  )
}
