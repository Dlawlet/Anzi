'use client'

import { useCallback, useState } from 'react'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { addressLine, whatsappUrl } from '@/utils/share'
import GoSheet from './go-sheet'
import { ChatIcon, CopyIcon, NavigateIcon } from './icons'
import ShareButton, { placeShareText } from './share-button'
import { primaryButton, secondaryButton } from './ui-classes'

// Share and "Y aller" buttons under an address card. The owner leads with sharing, a visitor with navigating.
export default function PlaceActions({ place, t, lead, whatsappTone, withShareSheet = true }: { place: PlaceView; t: Dict; lead: 'share' | 'navigate'; whatsappTone?: 'leaf'; withShareSheet?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [goOpen, setGoOpen] = useState(false)
  const closeGo = useCallback(() => setGoOpen(false), [])

  const shareText = placeShareText(place, t)

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(addressLine(place, t.card) || place.name)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked; the address is on screen anyway.
    }
  }

  // The system share sheet (image + text, any app, WhatsApp contacts included) leads; the WhatsApp link opens WhatsApp's
  // own contact list with the text only, and is the only share button where the browser has no share sheet.
  const share = (
    <div key="share" className="flex flex-col gap-2">
      {withShareSheet && <ShareButton place={place} t={t} text={shareText} className={lead === 'share' ? primaryButton : secondaryButton} />}
      <a href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer" className={whatsappTone === 'leaf' ? 'btn bg-leaf text-white' : secondaryButton}>
        <ChatIcon className="h-6 w-6" />
        {t.common.whatsapp}
      </a>
    </div>
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
