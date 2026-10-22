'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { addressCardBlob, canNativeShare, shareAddress } from '@/utils/addressCard'
import { buildShareText, whatsappUrl } from '@/utils/share'
import { SITE_URL } from '@/utils/site'
import { ShareIcon } from './icons'
import { placeCardData } from './save-card-button'

export const placeShareText = (place: PlaceView, t: Dict) =>
  buildShareText(place, { code: t.share.code, landmark: t.share.landmark, street: t.card.street, unnamed: t.card.unnamed, houseNo: t.card.houseNo }, SITE_URL)

const subscribeNever = () => () => {}

// "Partager": the system share sheet (WhatsApp with its contacts, Messages, ...) with the address card image and the text.
// The image is drawn on this phone as soon as the button appears, so the tap itself stays instant (iOS only allows
// sharing straight from a tap). Hidden where the browser has no share sheet: the WhatsApp link covers that case.
// Share sheet with the text only, for a result that is a position and not a saved place (no card image to draw).
export function TextShareButton({ title, text, label, className }: { title: string; text: string; label: string; className: string }) {
  const supported = useSyncExternalStore(subscribeNever, canNativeShare, () => false)
  if (!supported) return null

  async function share() {
    const result = await shareAddress(null, '', title, text)
    if (result === 'unsupported') window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer')
  }

  return (
    <button type="button" onClick={share} className={className}>
      <ShareIcon className="h-6 w-6" />
      {label}
    </button>
  )
}

export default function ShareButton({ place, t, text, className }: { place: PlaceView; t: Dict; text: string; className: string }) {
  const supported = useSyncExternalStore(subscribeNever, canNativeShare, () => false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!supported) return
    let alive = true
    addressCardBlob(placeCardData(place, t))
      .then((b) => alive && setBlob(b))
      .catch(() => {})
      .finally(() => alive && setDrawn(true))
    return () => {
      alive = false
    }
  }, [supported, place, t])

  if (!supported) return null

  async function share() {
    const result = await shareAddress(blob, t.card.fileName, place.name, text)
    if (result === 'unsupported') window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer')
  }

  return (
    <button type="button" onClick={share} disabled={!drawn} className={className}>
      <ShareIcon className="h-6 w-6" />
      {drawn ? t.common.share : t.card.saving}
    </button>
  )
}
