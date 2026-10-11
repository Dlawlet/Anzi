'use client'

import { useState } from 'react'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { addressCardBlob, saveAddressCard, type CardData } from '@/utils/addressCard'
import { BookmarkIcon } from './icons'

export function placeCardData(place: PlaceView, t: Dict): CardData {
  const d = t.create.done
  const english = place.street?.lang === 'en'
  return {
    brand: t.brand,
    addressLabel: d.addressLabel,
    category: (t.categories as Record<string, string>)[place.category] ?? '',
    number: place.houseNumber != null ? `${place.houseNumber}${place.houseSuffix}` : null,
    pending: d.numberPending,
    word: english ? d.streetWordEn : d.streetWord,
    name: place.street?.name || d.unnamedStreet,
    wordAfter: english,
    where: [place.quarter, place.city].filter(Boolean).join(' · '),
    placeName: place.name,
    landmarkLabel: t.card.landmark,
    landmark: place.landmark,
    note: t.card.communityNote,
  }
}

// "Enregistrer l'image": draws the address card (1080x1350 PNG) on this phone and hands it to the share sheet
// (WhatsApp, gallery, files) or downloads it. Nothing is uploaded.
export default function SaveCardButton({ place, t, className }: { place: PlaceView; t: Dict; className: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'failed'>('idle')

  async function save() {
    if (state === 'busy') return
    setState('busy')
    try {
      const blob = await addressCardBlob(placeCardData(place, t))
      const result = await saveAddressCard(blob, t.card.fileName, place.name)
      setState(result === 'cancelled' ? 'idle' : 'saved')
    } catch {
      setState('failed')
    }
  }

  return (
    <>
      <button type="button" onClick={save} disabled={state === 'busy'} className={className}>
        <BookmarkIcon className="h-6 w-6" />
        {state === 'busy' ? t.card.saving : t.card.save}
      </button>
      <p role="status" className={`text-center text-base ${state === 'failed' ? 'font-bold text-danger' : 'text-muted'} ${state === 'saved' || state === 'failed' ? '' : 'sr-only'}`}>
        {state === 'saved' ? t.card.saved : state === 'failed' ? t.card.saveFailed : ''}
      </p>
    </>
  )
}
