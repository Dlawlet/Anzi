'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/provider'
import { readLocalPlaces } from '@/utils/localPlaces'
import type { PlaceView } from '@/types/place'
import { linkButton } from './ui-classes'

// Up to three addresses saved on this phone; reads local storage only, so it also works offline.
export default function HomeMine() {
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

  if (places.length === 0) return null

  return (
    <section aria-labelledby="home-mine" className="mt-8">
      <h2 id="home-mine" className="text-xl font-bold">{t.home.myTitle}</h2>
      <ul className="mt-3 space-y-2">
        {places.slice(0, 3).map((place) => (
          <li key={place.code}>
            <Link
              href="/mine"
              className="block min-h-14 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 hover:border-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            >
              <span className="block break-words text-base font-semibold text-gray-900">{place.name}</span>
              <span className="block text-base text-gray-700">{place.code}</span>
            </Link>
          </li>
        ))}
      </ul>
      {places.length > 3 && <Link href="/mine" className={linkButton}>{t.home.seeAll}</Link>}
    </section>
  )
}
