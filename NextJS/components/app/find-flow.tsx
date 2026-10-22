'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/provider'
import { fmt } from '@/i18n/lang'
import type { Dict } from '@/i18n/dictionary'
import { hitLine, hitTitle, searchAddress, searchLocal, type Hit } from '@/utils/findClient'
import { readLocalPlaces } from '@/utils/localPlaces'
import { addRecent, clearRecent, readRecent, type Recent } from '@/utils/recentLocal'
import FindResult from './find-result'
import { StreetSuggestions, useStreetSuggestions } from './street-suggestions'
import { ChevronIcon, SearchIcon } from './icons'
import { inputClass, linkButton, primaryButton } from './ui-classes'

type View =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'list'; hits: Hit[]; q: string }
  | { kind: 'result'; hit: Hit; fromList: Hit[] | null; q: string }

// One box: "Manguier 12", a code or a public name. Several answers make a list ("Laquelle ?"), one answer goes
// straight to the result screen. Without a connection, the addresses saved on this phone answer.
async function run(raw: string, t: Dict): Promise<View> {
  const q = raw.trim()
  if (!q) return { kind: 'error', message: t.find.tooShort }
  const own = searchLocal(q, readLocalPlaces())
  if (!navigator.onLine) {
    if (own.length === 1) return { kind: 'result', hit: own[0], fromList: null, q }
    if (own.length > 1) return { kind: 'list', hits: own, q }
    return { kind: 'error', message: t.find.errors.network }
  }
  const outcome = await searchAddress(q)
  if (outcome.status === 'error') return { kind: 'error', message: t.find.errors[outcome.reason] }
  if (outcome.status === 'none') {
    // The server found nothing, but this phone may still know the address (it is the owner's own).
    if (own.length === 1) return { kind: 'result', hit: own[0], fromList: null, q }
    return { kind: 'error', message: outcome.type === 'code' ? t.find.notFoundCode : fmt(t.find.notFoundAddress, { q }) }
  }
  return outcome.hits.length === 1 ? { kind: 'result', hit: outcome.hits[0], fromList: null, q } : { kind: 'list', hits: outcome.hits, q }
}

export default function FindFlow({ initialCode }: { initialCode?: string }) {
  const { t } = useI18n()
  const [query, setQuery] = useState(initialCode ?? '')
  const input = useRef<HTMLInputElement>(null)
  const { items, accept } = useStreetSuggestions(query)
  const [view, setView] = useState<View>(initialCode ? { kind: 'loading' } : { kind: 'idle' })
  const [recent, setRecent] = useState<Recent[]>([])

  const open = useCallback(
    (hit: Hit, q: string) => {
      // "Recently opened" stays on this phone: only a label, a place and the text that found it.
      addRecent({ q, label: hitTitle(hit, t.card), sub: [hit.quarter, hit.city].filter(Boolean).join(' · '), lat: hit.lat, lng: hit.lng })
      setRecent(readRecent())
    },
    [t]
  )

  const search = useCallback(
    async (raw: string) => {
      setView({ kind: 'loading' })
      const next = await run(raw, t)
      if (next.kind === 'result') open(next.hit, next.q)
      setView(next)
    },
    [t, open]
  )

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setRecent(readRecent())
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Deep link (?q=... from the home box, ?code=... from a shared message): look it up once on arrival.
  useEffect(() => {
    if (!initialCode) return
    let cancelled = false
    run(initialCode, t).then((next) => {
      if (cancelled) return
      if (next.kind === 'result') open(next.hit, next.q)
      setView(next)
    })
    return () => {
      cancelled = true
    }
  }, [initialCode, t, open])

  const loading = view.kind === 'loading'

  return (
    <div>
      <h1 className="text-2xl font-extrabold leading-snug">{t.find.title}</h1>

      <form
        noValidate
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!loading) search(query)
        }}
      >
        <div>
          <label htmlFor="q" className="mb-1 block text-base font-bold">{t.find.label}</label>
          <input
            ref={input}
            id="q"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby="q-hint"
            className={inputClass(view.kind === 'error')}
          />
          <StreetSuggestions
            items={items}
            label={t.find.label}
            onPick={(item) => {
              setQuery(accept(item))
              input.current?.focus()
            }}
          />
          <p id="q-hint" className="mt-1 text-base text-muted">{t.find.hint}</p>
        </div>
        <button type="submit" disabled={loading} className={primaryButton}>
          <SearchIcon className="h-6 w-6" />
          {loading ? t.find.searching : t.find.button}
        </button>
      </form>

      <div aria-live="polite" className="mt-5">
        {view.kind === 'error' && (
          <p role="alert" className="rounded-2xl border-2 border-danger bg-white p-3 text-base font-bold text-danger">
            {view.message}
          </p>
        )}

        {view.kind === 'list' && (
          <section aria-labelledby="results-title">
            <h2 id="results-title" className="mb-2 text-lg font-extrabold">{fmt(t.find.several, { k: view.hits.length, q: view.q })}</h2>
            <ul className="space-y-2">
              {view.hits.map((hit) => (
                <li key={hit.key}>
                  <button
                    type="button"
                    onClick={() => {
                      open(hit, view.q)
                      setView({ kind: 'result', hit, fromList: view.hits, q: view.q })
                    }}
                    className="flex min-h-16 w-full items-center gap-3 rounded-[18px] bg-white py-3 pl-3 pr-2.5 text-left shadow-warm1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-clay"
                  >
                    {hit.number != null && <span className="plate-no flex-none">{hit.number}{hit.suffix}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[17px] font-bold leading-snug">{hit.street?.name ? fmt(t.card.street, { n: '', name: hit.street.name }).trim() : hitTitle(hit, t.card)}</span>
                      {hit.formerName && <span className="block break-words text-[15px] font-bold text-clay-700">{fmt(t.find.formerName, { name: hit.formerName })}</span>}
                      <span className="block break-words text-[15px] text-muted">{hit.legacyTitle ? hit.city : [hit.place?.name, hit.quarter, hit.city].filter(Boolean).join(' · ')}</span>
                    </span>
                    <ChevronIcon className="h-5 w-5 flex-none text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {view.kind === 'result' && (
          <FindResult key={view.hit.key} hit={view.hit} t={t} onBack={view.fromList ? () => setView({ kind: 'list', hits: view.fromList as Hit[], q: view.q }) : undefined} />
        )}

        {(view.kind === 'idle' || view.kind === 'error') && recent.length > 0 && (
          <section aria-labelledby="recent-title" className="mt-6">
            <div className="flex items-center justify-between gap-2">
              <h2 id="recent-title" className="text-lg font-extrabold">{t.find.recentTitle}</h2>
              <button
                type="button"
                onClick={() => {
                  clearRecent()
                  setRecent([])
                }}
                className={linkButton}
              >
                {t.find.recentClear}
              </button>
            </div>
            <p className="text-base text-muted">{t.find.recentNote}</p>
            <ul className="mt-2 space-y-2">
              {recent.map((item) => (
                <li key={`${item.label}:${item.lat}:${item.lng}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(item.q)
                      search(item.q)
                    }}
                    className="flex min-h-14 w-full items-center gap-3 rounded-[18px] bg-white px-3.5 py-2.5 text-left shadow-warm1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-clay"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[17px] font-bold leading-snug">{item.label}</span>
                      {item.sub && <span className="block break-words text-[15px] text-muted">{item.sub}</span>}
                    </span>
                    <ChevronIcon className="h-5 w-5 flex-none text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
