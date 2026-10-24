'use client'

import Link from 'next/link'
import type { Dict } from '@/i18n/dictionary'
import { isShareable, type PlaceView } from '@/types/place'
import AddressPlate from './address-plate'
import Logo from './logo'
import ManageKeyBox from './manage-key-box'
import PlaceActions from './place-actions'
import ReviewNotice from './review-notice'
import SaveCardButton from './save-card-button'
import ShareButton, { placeShareText } from './share-button'
import { CategoryIcon } from './icons'
import { addressLine, placeWhere } from '@/utils/share'

// Success screen: dark, with the address card (logo, orange plate, quarter and city, landmark). The card never shows
// the Anzi code, a site URL or a QR (CLAUDE.md); the code only travels inside the WhatsApp text for now.
export default function CreateDone(props: {
  place: PlaceView
  manageKey: string
  t: Dict
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnother: () => void
}) {
  const { place, manageKey, t, headingRef, onAnother } = props
  const d = t.create.done
  const number = place.houseNumber != null ? `${place.houseNumber}${place.houseSuffix}` : null
  const streetName = place.street?.name || d.unnamedStreet
  const english = place.street?.lang === 'en'
  const where = placeWhere(place)
  const category = (t.categories as Record<string, string>)[place.category]
  const shareable = isShareable(place)

  return (
    <div className="-mx-4 -mt-6 bg-night-900 px-4 pb-8 pt-8 text-white md:mx-0 md:mt-0 md:rounded-3xl">
      <p className="text-base font-extrabold uppercase tracking-[0.14em] text-sun">{d.eyebrow}</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-[30px] font-extrabold leading-tight tracking-tight outline-none">
        {d.title}
      </h1>

      <article className="mt-5 rounded-3xl border border-white/10 bg-night-800 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[19px] font-extrabold">
            <Logo size={32} onDark />
            {t.brand}
          </span>
          {category && (
            <span className="flex items-center gap-1.5 rounded-full bg-sun-200 px-3 py-1 text-sm font-bold text-earth">
              <CategoryIcon category={place.category} className="h-4 w-4" />
              {category}
            </span>
          )}
        </div>

        <p className="mt-4 text-sm font-bold uppercase tracking-[0.14em] text-night-300">{d.addressLabel}</p>
        <div className="mt-2">
          <AddressPlate number={number} word={english ? d.streetWordEn : d.streetWord} name={streetName} pending={d.numberPending} wordAfter={english} />
        </div>
        {number === null && <p className="mt-2 text-base text-night-300">{d.numberPendingNote}</p>}

        {where && <p className="mt-4 break-words text-[19px] font-extrabold">{where}</p>}
        <p className="break-words text-base text-night-300">{place.name}</p>

        {place.landmark && (
          <p className="mt-3 break-words rounded-2xl bg-night-700 p-3 text-base text-white">
            <span className="font-bold text-sun-200">{t.card.landmark} : </span>
            {place.landmark}
          </p>
        )}
        <p className="mt-3 text-sm text-night-300">{t.card.communityNote}</p>
      </article>

      {shareable ? (
        <>
          <p className="mt-5 text-base text-night-300">{d.next}</p>
          {/* Sticky: "Partager" stays at the bottom of the screen while the card and the other actions scroll. */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-3 bg-night-900/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur empty:hidden">
            <ShareButton place={place} t={t} text={placeShareText(place, t)} className="btn btn-primary w-full" />
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <PlaceActions place={place} t={t} lead="share" whatsappTone="leaf" withShareSheet={false} />
            <SaveCardButton place={place} t={t} className="btn bg-white text-night-900" />
          </div>
        </>
      ) : (
        // Nobody else can open it before the admin approves it: sharing would hand out a dead link.
        <div className="mt-5">
          <ReviewNotice place={place} t={t} />
        </div>
      )}
      {manageKey && <ManageKeyBox manageKey={manageKey} address={addressLine(place, t.card) || place.name} t={t} />}
      <p className="mt-3 text-center text-base text-night-300">{t.visibility.short[place.visibility]}. {d.savedOnDevice}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4">
        <Link href="/mine" className="inline-flex min-h-12 items-center px-2 text-base font-bold text-sun-200 underline">{d.mine}</Link>
        <button type="button" onClick={onAnother} className="inline-flex min-h-12 items-center px-2 text-base font-bold text-sun-200 underline">{d.another}</button>
      </div>
    </div>
  )
}
