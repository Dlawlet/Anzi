'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import type { Dict } from '@/i18n/dictionary'
import { fmt } from '@/i18n/lang'
import { hitLine, hitTitle, type Hit } from '@/utils/findClient'
import { mapsViewUrl, placeWhere, whatsappUrl } from '@/utils/share'
import { staticMapUrl, type MapView } from '@/utils/staticMap'
import AddressPlate from './address-plate'
import GoSheet from './go-sheet'
import { CategoryIcon, ChatIcon, CopyIcon, NavigateIcon } from './icons'
import MapCard from './map-card'
import MapPreview from './map-preview'
import SaveCardButton from './save-card-button'
import ShareButton, { placeShareText, TextShareButton } from './share-button'
import { primaryButton, secondaryButton } from './ui-classes'

const ZOOM = 17
// Metres per pixel at this latitude for 512 px tiles (Web Mercator).
const metresPerPixel = (lat: number) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** ZOOM)

// Teardrop pin with the house number, its tip on the address. The accuracy circle is drawn under it.
function Pin({ view, hit }: { view: MapView; hit: Hit }) {
  const number = hit.number != null ? `${hit.number}${hit.suffix}` : ''
  const radius = hit.precisionM ? Math.min(Math.max(hit.precisionM / metresPerPixel(hit.lat), 10), view.height / 2 - 8) : 0
  return (
    <>
      {radius > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-[2] rounded-full border-2 border-dashed border-sun bg-sun/15"
          style={{ left: '50%', top: '50%', width: radius * 2, height: radius * 2, transform: 'translate(-50%, -50%)' }}
        />
      )}
      <span aria-hidden="true" className="pointer-events-none absolute z-[3]" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}>
        <svg width="50" height="66" viewBox="0 0 50 66">
          <path d="M25 64C25 64 4 40 4 24a21 21 0 0 1 42 0c0 16-21 40-21 40z" fill="#42210B" />
          <circle cx="25" cy="24" r="15" fill="#FFF3E3" />
          <text x="25" y="30" textAnchor="middle" fontSize={number.length > 3 ? 12 : 17} fontWeight="800" fill="#42210B">{number}</text>
        </svg>
      </span>
    </>
  )
}

// The answer to a search (docs/design-2026-10.md 4.3): the map first, with the pin and the number, then the address
// card. "Y aller" is a secondary action; "Agrandir" opens the live map on the same address.
export default function FindResult({ hit, t, onBack }: { hit: Hit; t: Dict; onBack?: () => void }) {
  const [goOpen, setGoOpen] = useState(false)
  const closeGo = useCallback(() => setGoOpen(false), [])
  const [copied, setCopied] = useState(false)

  const view: MapView = { center: [hit.lng, hit.lat], zoom: ZOOM, width: 360, height: 224 }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const title = hitTitle(hit, t.card)
  const line = hitLine(hit, t.card)
  const place = hit.place
  // A position without a saved place has no code or Anzi link: the text is the address and a Google Maps link.
  const shareText = place ? placeShareText(place, t) : [line, mapsViewUrl(hit)].filter(Boolean).join('\n')
  const english = hit.street?.lang === 'en'
  const where = placeWhere({ street: hit.place?.street ?? null, quarter: hit.quarter, city: hit.city })
  const category = place ? (t.categories as Record<string, string>)[place.category] : undefined
  const named = Boolean(hit.street?.name)

  async function copy() {
    try {
      await navigator.clipboard.writeText(line)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked; the address is on screen anyway.
    }
  }

  return (
    <section aria-label={title} className="space-y-4">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center text-base font-bold text-clay-700 underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-clay">
          {t.find.otherResults}
        </button>
      )}

      <div className="overflow-hidden rounded-3xl border-2 border-line shadow-warm1">
        <MapCard view={view} streets={[]} tags={[]} label={fmt(t.find.mapLabel, { address: line })} hit={hit}>
          <MapPreview
            view={view}
            imageUrl={token ? staticMapUrl(view, token) : null}
            imageUrl2x={token ? staticMapUrl(view, token, { retina: true }) : null}
            streets={[]}
            tags={[]}
            chip={hit.street?.name ? (english ? `${hit.street.name} ${t.create.done.streetWordEn}` : `${t.create.done.streetWord} ${hit.street.name}`) : hit.city || title}
            label={fmt(t.find.mapLabel, { address: line })}
          />
          <Pin view={view} hit={hit} />
        </MapCard>
      </div>

      <article className="rounded-3xl bg-white p-4 shadow-warm1">
        <div className="flex flex-wrap items-center gap-2">
          {category && place && (
            <span className="flex items-center gap-1.5 rounded-full bg-sun-200 px-3 py-1 text-sm font-bold text-earth">
              <CategoryIcon category={place.category} className="h-4 w-4" />
              {category}
            </span>
          )}
          {named && hit.street && (
            <span className="rounded-full border-2 border-dashed border-clay px-3 py-0.5 text-sm font-bold text-clay-700">
              {hit.street.provisional ? t.find.provisionalName : t.find.communityName}
            </span>
          )}
          {place?.isOwner && <span className="text-sm font-bold text-leaf">{t.find.owner}</span>}
        </div>

        <div className="mt-3">
          {hit.number != null && hit.street ? (
            <AddressPlate
              number={`${hit.number}${hit.suffix}`}
              word={english ? t.create.done.streetWordEn : t.create.done.streetWord}
              name={hit.street.name || t.create.done.unnamedStreet}
              pending={t.create.done.numberPending}
              wordAfter={english}
            />
          ) : (
            <h2 className="break-words text-2xl font-extrabold leading-snug">{title}</h2>
          )}
        </div>

        {where && <p className="mt-3 break-words text-[19px] font-extrabold">{where}</p>}
        {hit.formerName && <p className="break-words text-base font-bold text-clay-700">{fmt(t.find.formerName, { name: hit.formerName })}</p>}
        {place && place.name !== title && <p className="break-words text-base text-muted">{place.name}</p>}
        {place?.landmark && (
          <p className="mt-3 break-words rounded-2xl bg-sun-50 p-3 text-base">
            <span className="font-bold">{t.card.landmark} : </span>
            {place.landmark}
          </p>
        )}
        {!place && hit.number != null && hit.precisionM != null && (
          <p className="mt-3 text-base text-muted">{fmt(t.find.spotNote, { n: `${hit.number}${hit.suffix}`, m: Math.round(hit.precisionM) })}</p>
        )}
        <p className="mt-3 text-sm text-muted">{t.card.communityNote}</p>
      </article>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setGoOpen(true)} className={secondaryButton}>
          <NavigateIcon className="h-6 w-6" />
          {t.go.title}
        </button>
        <GoSheet lat={hit.lat} lng={hit.lng} label={line} open={goOpen} onClose={closeGo} />
        {place ? (
          <ShareButton place={place} t={t} text={shareText} className={secondaryButton} />
        ) : (
          <TextShareButton title={title} text={shareText} label={t.common.share} className={secondaryButton} />
        )}
        <a href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
          <ChatIcon className="h-6 w-6" />
          {t.common.whatsapp}
        </a>
        <button type="button" onClick={copy} className={secondaryButton}>
          <CopyIcon className="h-6 w-6" />
          {copied ? t.common.copied : t.common.copy}
        </button>
        {place?.isOwner && <SaveCardButton place={place} t={t} className={secondaryButton} />}
        <p role="status" className="sr-only">{copied ? t.common.copied : ''}</p>
      </div>

      <aside className="rounded-3xl bg-night-900 p-4 text-white">
        <p className="text-[19px] font-extrabold leading-snug">{t.find.growth}</p>
        <Link href="/create" className={`${primaryButton} mt-3`}>{t.find.growthCta}</Link>
      </aside>
    </section>
  )
}
