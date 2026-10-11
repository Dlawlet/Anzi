'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/provider'
import type { Dict } from '@/i18n/dictionary'
import { readLocalPlaces, removeLocalPlace, replaceLocalPlaces, saveLocalPlace } from '@/utils/localPlaces'
import { addressTitle } from '@/utils/share'
import type { PlaceView } from '@/types/place'
import PlaceActions from './place-actions'
import PlaceCard from './place-card'
import { linkButton, primaryButton, secondaryButton } from './ui-classes'

type Visibility = PlaceView['visibility']
type Item = { place: PlaceView; managed: boolean }
type Load = { status: 'loading' | 'ready' | 'offline'; items: Item[] }

const VISIBILITY_ORDER: Visibility[] = ['link', 'public', 'private']

// Server list first (editable); copies that only exist on this phone are kept, read-only.
function merge(server: PlaceView[], local: PlaceView[]): Item[] {
  const known = new Set(server.map((p) => p.code))
  return [
    ...server.map((place) => ({ place, managed: true })),
    ...local.filter((p) => !known.has(p.code)).map((place) => ({ place: { ...place, isOwner: false }, managed: false })),
  ]
}

export default function MineFlow() {
  const { t } = useI18n()
  const [load, setLoad] = useState<Load>({ status: 'loading', items: [] })
  const [openCode, setOpenCode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const local = readLocalPlaces()
      if (!cancelled) setLoad({ status: 'loading', items: merge([], local) })
      try {
        const res = await fetch('/api/places?mine=1')
        if (!res.ok) throw new Error('bad status')
        const body = (await res.json()) as { places?: PlaceView[] }
        const items = merge(body.places ?? [], local)
        // Keep the copies of addresses this device can no longer manage; refresh the rest.
        replaceLocalPlaces(items.map((i) => i.place))
        if (!cancelled) setLoad({ status: 'ready', items })
      } catch {
        if (!cancelled) setLoad({ status: 'offline', items: merge([], local) })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const update = (place: PlaceView) =>
    setLoad((l) => ({ ...l, items: l.items.map((i) => (i.place.code === place.code ? { ...i, place } : i)) }))
  const drop = (code: string) => {
    removeLocalPlace(code)
    setOpenCode((c) => (c === code ? null : c))
    setLoad((l) => ({ ...l, items: l.items.filter((i) => i.place.code !== code) }))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold leading-snug">{t.mine.title}</h1>

      {load.status === 'offline' && (
        <p role="status" className="mt-4 rounded-lg border border-amber-700 bg-amber-50 p-3 text-base text-gray-900">
          {t.mine.offline}
        </p>
      )}
      {load.status === 'loading' && load.items.length === 0 && (
        <p role="status" className="mt-4 text-base text-gray-700">{t.mine.loading}</p>
      )}

      {load.status !== 'loading' && load.items.length === 0 && (
        <div className="mt-4 space-y-4">
          <p className="text-base text-gray-900">{t.mine.empty}</p>
          <Link href="/create" className={primaryButton}>{t.mine.create}</Link>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {load.items.map(({ place, managed }) => (
          <li key={place.code} className="rounded-2xl border-2 border-gray-300 bg-white">
            <button
              type="button"
              aria-expanded={openCode === place.code}
              onClick={() => setOpenCode(openCode === place.code ? null : place.code)}
              className="block min-h-14 w-full rounded-2xl px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            >
              <span className="block break-words text-base font-semibold text-gray-900">{addressTitle(place, t.card)}</span>
              <span className="block break-words text-base text-gray-700">
                {[addressTitle(place, t.card) === place.name ? '' : place.name, place.quarter].filter(Boolean).join(' · ')}
              </span>
              <span className="block text-base text-gray-700">{t.visibility.short[place.visibility]}</span>
              <span className="mt-1 block text-base font-medium text-green-800">
                {openCode === place.code ? t.mine.close : t.mine.open}
              </span>
            </button>
            {openCode === place.code && (
              <Details place={place} managed={managed} t={t} onChange={update} onGone={drop} />
            )}
          </li>
        ))}
      </ul>

      {load.items.length > 0 && (
        <div className="mt-5">
          <Link href="/create" className={secondaryButton}>{t.mine.create}</Link>
        </div>
      )}
    </div>
  )
}

function Details(props: {
  place: PlaceView
  managed: boolean
  t: Dict
  onChange: (place: PlaceView) => void
  onGone: (code: string) => void
}) {
  const { place, managed, t, onChange, onGone } = props
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function setVisibility(visibility: Visibility) {
    if (busy || visibility === place.visibility) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(place.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      })
      if (!res.ok) throw new Error('bad status')
      const next = (await res.json()) as PlaceView
      saveLocalPlace(next)
      onChange(next)
      setMessage(t.mine.visibilitySaved)
    } catch {
      setError(t.mine.error)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(place.code)}`, { method: 'DELETE' })
      // 404 means it is already gone on the server: drop the local copy too.
      if (!res.ok && res.status !== 404) throw new Error('bad status')
      onGone(place.code)
    } catch {
      setError(t.mine.error)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 border-t-2 border-gray-200 p-4">
      <PlaceCard place={place} t={t} />
      <PlaceActions place={place} t={t} lead="share" />

      {managed ? (
        <>
          <fieldset disabled={busy}>
            <legend className="mb-2 text-base font-semibold text-gray-900">{t.mine.visibilityLabel}</legend>
            <div className="space-y-2">
              {VISIBILITY_ORDER.map((value) => (
                <label key={value} className="block cursor-pointer">
                  <input
                    type="radio"
                    name={`visibility-${place.code}`}
                    checked={place.visibility === value}
                    onChange={() => setVisibility(value)}
                    className="peer sr-only"
                  />
                  <span className="block min-h-12 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-900 peer-checked:border-green-700 peer-checked:bg-green-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-700">
                    {t.visibility[value]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p role="status" className="text-base font-medium text-green-800">{message}</p>
        </>
      ) : (
        <p className="text-base text-gray-700">{t.mine.localOnly}</p>
      )}

      {error && <p role="alert" className="text-base font-medium text-red-700">{error}</p>}

      {!managed ? (
        <button type="button" onClick={() => onGone(place.code)} className={linkButton}>{t.mine.removeLocal}</button>
      ) : confirming ? (
        <div className="space-y-2 rounded-xl border-2 border-red-700 bg-red-50 p-4">
          <p className="text-base font-medium text-gray-900">{t.mine.deleteConfirm}</p>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-red-700 px-4 py-3 text-base font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60"
          >
            {busy ? t.mine.deleting : t.mine.deleteYes}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={linkButton}>{t.mine.cancel}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={linkButton}>{t.mine.delete}</button>
      )}
    </div>
  )
}
