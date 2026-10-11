'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/provider'
import type { Dict } from '@/i18n/dictionary'
import { normalizeCode } from '@/utils/codeFormat.js'
import { addressLine } from '@/utils/share'
import type { PlaceView } from '@/types/place'
import PlaceActions from './place-actions'
import PlaceCard from './place-card'
import { SearchIcon } from './icons'
import { inputClass, primaryButton } from './ui-classes'

type View =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'place'; place: PlaceView }
  | { kind: 'list'; places: PlaceView[] }

// A code ("yde 7k4m") looks the place up directly; any other text searches public places by name.
async function lookup(raw: string, t: Dict): Promise<View> {
  const text = raw.trim()
  if (!text) return { kind: 'error', message: t.find.tooShort }
  const code = normalizeCode(text)

  try {
    const res = await fetch(code ? `/api/places/${encodeURIComponent(code)}` : `/api/places?search=${encodeURIComponent(text)}`)
    if (res.status === 429) return { kind: 'error', message: t.find.errors.tooMany }
    if (res.status === 404 || (res.status === 400 && code)) return { kind: 'error', message: t.find.notFoundCode }
    if (!res.ok) return { kind: 'error', message: t.find.errors.generic }
    const body = await res.json()
    if (code) return { kind: 'place', place: body as PlaceView }
    const places = (body.places ?? []) as PlaceView[]
    return places.length > 0 ? { kind: 'list', places } : { kind: 'error', message: t.find.notFoundName }
  } catch {
    return { kind: 'error', message: t.find.errors.network }
  }
}

export default function FindFlow({ initialCode }: { initialCode?: string }) {
  const { t } = useI18n()
  const [query, setQuery] = useState(initialCode ?? '')
  const [view, setView] = useState<View>(initialCode ? { kind: 'loading' } : { kind: 'idle' })

  // Deep link (?code=...): look it up once on arrival.
  useEffect(() => {
    if (!initialCode) return
    let cancelled = false
    lookup(initialCode, t).then((next) => {
      if (!cancelled) setView(next)
    })
    return () => {
      cancelled = true
    }
  }, [initialCode, t])

  async function search() {
    setView({ kind: 'loading' })
    setView(await lookup(query, t))
  }

  const loading = view.kind === 'loading'

  return (
    <div>
      <h1 className="text-2xl font-bold leading-snug">{t.find.title}</h1>

      <form
        noValidate
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!loading) search()
        }}
      >
        <div>
          <label htmlFor="q" className="mb-1 block text-base font-semibold text-gray-900">{t.find.label}</label>
          <p id="q-hint" className="mb-2 text-base text-gray-700">{t.find.hint}</p>
          <input
            id="q"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby="q-hint"
            className={inputClass(view.kind === 'error')}
          />
        </div>
        <button type="submit" disabled={loading} className={primaryButton}>
          <SearchIcon className="h-6 w-6" />
          {loading ? t.find.searching : t.find.button}
        </button>
      </form>

      <div aria-live="polite" className="mt-5">
        {view.kind === 'error' && (
          <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-base font-medium text-red-700">
            {view.message}
          </p>
        )}

        {view.kind === 'list' && (
          <section aria-labelledby="results-title">
            <h2 id="results-title" className="mb-2 text-base font-semibold text-gray-900">{t.find.results}</h2>
            <ul className="space-y-2">
              {view.places.map((place) => (
                <li key={place.code}>
                  <button
                    type="button"
                    onClick={() => setView({ kind: 'place', place })}
                    className="block min-h-14 w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-left hover:border-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                  >
                    <span className="block break-words text-base font-semibold text-gray-900">{place.name}</span>
                    <span className="block break-words text-base text-gray-700">
                      {addressLine(place, t.card)} · {place.code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {view.kind === 'place' && (
          <section className="space-y-4">
            {view.place.isOwner && (
              <p className="text-base font-semibold text-green-800">{t.find.owner}</p>
            )}
            <PlaceCard place={view.place} t={t} />
            <PlaceActions place={view.place} t={t} lead="navigate" />
          </section>
        )}
      </div>
    </div>
  )
}
