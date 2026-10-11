'use client'

import Link from 'next/link'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import AddressPlate from './address-plate'
import Logo from './logo'
import PlaceActions from './place-actions'
import { CategoryIcon } from './icons'

// Success screen: dark, with the address card (logo, orange plate, quarter and city, landmark). The card never shows
// the Anzi code, a site URL or a QR (CLAUDE.md); the code only travels inside the WhatsApp text for now.
export default function CreateDone(props: {
  place: PlaceView
  t: Dict
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnother: () => void
}) {
  const { place, t, headingRef, onAnother } = props
  const d = t.create.done
  const number = place.houseNumber != null ? `${place.houseNumber}${place.houseSuffix}` : null
  const streetName = place.street?.name || d.unnamedStreet
  const english = place.street?.lang === 'en'
  const where = [place.quarter, place.city].filter(Boolean).join(' · ')
  const category = (t.categories as Record<string, string>)[place.category]

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

      <p className="mt-5 text-base text-night-300">{d.next}</p>
      <div className="mt-4">
        <PlaceActions place={place} t={t} lead="share" whatsappTone="leaf" />
      </div>
      <p className="mt-3 text-center text-base text-night-300">{t.visibility.short[place.visibility]}. {d.savedOnDevice}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4">
        <Link href="/mine" className="inline-flex min-h-12 items-center px-2 text-base font-bold text-sun-200 underline">{d.mine}</Link>
        <button type="button" onClick={onAnother} className="inline-flex min-h-12 items-center px-2 text-base font-bold text-sun-200 underline">{d.another}</button>
      </div>
    </div>
  )
}
