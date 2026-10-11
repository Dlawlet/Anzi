'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/provider'
import { fmt } from '@/i18n/lang'
import { readLocalPlaces } from '@/utils/localPlaces'
import { addressLine, buildShareText, whatsappUrl } from '@/utils/share'
import { SITE_URL } from '@/utils/site'
import type { PlaceView } from '@/types/place'
import { CategoryIcon, ChatIcon, ChevronIcon } from './icons'

// Up to three addresses saved on this phone; reads local storage only, so it also works offline.
// Without any, `fallback` (the server-rendered how-it-works steps) is shown, also before this component hydrates.
export default function HomeMine({ fallback }: { fallback?: React.ReactNode }) {
  const { t } = useI18n()
  const [places, setPlaces] = useState<PlaceView[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setPlaces(readLocalPlaces())
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (places.length === 0) return <>{fallback}</>

  return (
    <section aria-labelledby="home-mine" className="px-4 pt-7">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 id="home-mine" className="text-xl font-extrabold leading-[1.3] tracking-[-0.015em]">{t.home.myTitle}</h2>
        {places.length > 3 && (
          <Link href="/mine" className="inline-flex min-h-12 items-center gap-1 font-bold text-clay-700 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-clay">
            {fmt(t.home.seeAll, { n: places.length })}
            <ChevronIcon className="h-5 w-5" />
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-2.5">
        {places.slice(0, 3).map((place) => {
          const title = addressLine({ ...place, quarter: '', city: '' }, t.card) || place.name
          const sub = [title === place.name ? '' : place.name, place.quarter].filter(Boolean).join(' · ')
          const shareText = buildShareText(
            place,
            { code: t.share.code, landmark: t.share.landmark, street: t.card.street, unnamed: t.card.unnamed, houseNo: t.card.houseNo },
            SITE_URL
          )
          return (
            <li key={place.code} className="flex items-center gap-3 rounded-[18px] bg-white py-3 pl-3 pr-2.5 shadow-warm1">
              <Link href="/mine" className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-clay">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-[14px] bg-earth text-sun-200">
                  <CategoryIcon category={place.category} className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 break-words text-[17px] font-bold leading-[1.3]">{title}</span>
                  {sub && <span className="truncate text-[15px] text-muted">{sub}</span>}
                  <span className="text-sm text-muted">{t.visibility.short[place.visibility]}</span>
                </span>
              </Link>
              <a
                href={whatsappUrl(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-14 w-16 flex-none flex-col items-center justify-center gap-px rounded-[14px] bg-leaf-50 text-leaf focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <ChatIcon className="h-6 w-6" />
                <span className="text-[13px] font-bold">{t.home.send}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
