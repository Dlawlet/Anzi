'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/provider'
import type { Dict } from '@/i18n/dictionary'
import { readLocalPlaces, removeLocalPlace, replaceLocalPlaces, saveLocalPlace } from '@/utils/localPlaces'
import { addressTitle, placeWhere } from '@/utils/share'
import type { PlaceView } from '@/types/place'
import AddressPlate from './address-plate'
import { CategoryIcon, ChevronIcon } from './icons'
import PlaceActions from './place-actions'
import SaveCardButton from './save-card-button'
import { inputClass, linkButton, primaryButton, secondaryButton } from './ui-classes'

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

// The addresses created or recovered on this phone. There are no accounts: the management key (shown once at
// creation) is what brings an address back on a new phone, so the recovery form sits under the list.
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
  const recovered = (place: PlaceView) => {
    saveLocalPlace(place)
    setOpenCode(place.code)
    setLoad((l) => ({ status: l.status === 'offline' ? 'ready' : l.status, items: [{ place, managed: true }, ...l.items.filter((i) => i.place.code !== place.code)] }))
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold leading-snug">{t.mine.title}</h1>
      <p className="mt-1 text-base text-muted">{t.mine.lead}</p>

      {load.status === 'offline' && (
        <p role="status" className="mt-4 rounded-2xl border-2 border-clay bg-sun-50 p-3 text-base font-bold">
          {t.mine.offline}
        </p>
      )}
      {load.status === 'loading' && load.items.length === 0 && (
        <p role="status" className="mt-4 text-base text-muted">{t.mine.loading}</p>
      )}

      {load.status !== 'loading' && load.items.length === 0 && (
        <div className="mt-4 space-y-4 rounded-3xl bg-white p-4 shadow-warm1">
          <p className="text-base">{t.mine.empty}</p>
          <Link href="/create" className={primaryButton}>{t.mine.create}</Link>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {load.items.map(({ place, managed }) => {
          const title = addressTitle(place, t.card)
          const sub = [title === place.name ? '' : place.name, place.quarter].filter(Boolean).join(' · ')
          const isOpen = openCode === place.code
          return (
            <li key={place.code} className="rounded-[18px] bg-white shadow-warm1">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenCode(isOpen ? null : place.code)}
                className="flex min-h-[76px] w-full items-center gap-3 rounded-[18px] py-3 pl-3 pr-3 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-clay"
              >
                <span className="grid h-12 w-12 flex-none place-items-center rounded-[14px] bg-earth text-sun-200">
                  <CategoryIcon category={place.category} className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 break-words text-[17px] font-bold leading-[1.3]">{title}</span>
                  {sub && <span className="truncate text-[15px] text-muted">{sub}</span>}
                  <span className="text-sm text-muted">{t.visibility.short[place.visibility]}</span>
                </span>
                <ChevronIcon className={`h-5 w-5 flex-none text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && <Details place={place} managed={managed} t={t} onChange={update} onGone={drop} />}
            </li>
          )
        })}
      </ul>

      {load.items.length > 0 && (
        <div className="mt-5">
          <Link href="/create" className={secondaryButton}>{t.mine.create}</Link>
        </div>
      )}

      <Recover t={t} onRecovered={recovered} />
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
  const english = place.street?.lang === 'en'
  const where = placeWhere(place)

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
    <div className="space-y-4 border-t-2 border-line p-4">
      <AddressPlate
        number={place.houseNumber != null ? `${place.houseNumber}${place.houseSuffix}` : null}
        word={english ? t.create.done.streetWordEn : t.create.done.streetWord}
        name={place.street?.name || t.create.done.unnamedStreet}
        pending={t.create.done.numberPending}
        wordAfter={english}
      />
      {where && <p className="break-words text-[19px] font-extrabold">{where}</p>}
      {place.landmark && (
        <p className="break-words rounded-2xl bg-sun-50 p-3 text-base">
          <span className="font-bold">{t.card.landmark} : </span>
          {place.landmark}
        </p>
      )}

      <PlaceActions place={place} t={t} lead="share" />
      <SaveCardButton place={place} t={t} className={secondaryButton} />

      {managed ? (
        <>
          <fieldset disabled={busy}>
            <legend className="mb-2 text-base font-bold">{t.mine.visibilityLabel}</legend>
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
                  <span className="choice peer-checked:border-clay peer-checked:bg-sun-50 peer-checked:shadow-[0_0_0_3px_#ffe2bf] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay">
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold leading-tight">{t.visibility[value]}</span>
                      <span className="block text-base text-muted">{t.visibility[`${value}Hint` as 'linkHint']}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p role="status" className="text-base font-bold text-leaf">{message}</p>
        </>
      ) : (
        <p className="text-base text-muted">{t.mine.localOnly}</p>
      )}

      {error && <p role="alert" className="text-base font-bold text-danger">{error}</p>}

      {!managed ? (
        <button type="button" onClick={() => onGone(place.code)} className={linkButton}>{t.mine.removeLocal}</button>
      ) : confirming ? (
        <div className="space-y-2 rounded-2xl border-2 border-danger bg-white p-4">
          <p className="text-base font-bold">{t.mine.deleteConfirm}</p>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="btn bg-danger text-white"
          >
            {busy ? t.mine.deleting : t.mine.deleteYes}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={linkButton}>{t.mine.cancel}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${linkButton} !text-danger`}>{t.mine.delete}</button>
      )}
    </div>
  )
}

// New phone, cleared data: the management key gives the address back to this device.
function Recover({ t, onRecovered }: { t: Dict; onRecovered: (place: PlaceView) => void }) {
  const [key, setKey] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'bad' | 'error' | 'ok'>('idle')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (state === 'busy' || !key.trim()) return
    setState('busy')
    try {
      const res = await fetch('/api/places/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (res.status === 404 || res.status === 400) return setState('bad')
      if (!res.ok) return setState('error')
      onRecovered((await res.json()) as PlaceView)
      setKey('')
      setState('ok')
    } catch {
      setState('error')
    }
  }

  return (
    <section aria-labelledby="recover-title" className="mt-8 rounded-3xl bg-white p-4 shadow-warm1">
      <h2 id="recover-title" className="text-lg font-extrabold">{t.mine.claimTitle}</h2>
      <p className="mt-1 text-base text-muted">{t.mine.claimText}</p>
      <form onSubmit={submit} noValidate className="mt-3 space-y-3">
        <div>
          <label htmlFor="manage-key" className="mb-1 block text-base font-bold">{t.mine.claimLabel}</label>
          <input
            id="manage-key"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={24}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-describedby="manage-key-hint"
            className={inputClass(state === 'bad')}
          />
          <p id="manage-key-hint" className="mt-1 text-base text-muted">{t.mine.claimHint}</p>
        </div>
        <button type="submit" disabled={state === 'busy'} className={secondaryButton}>
          {state === 'busy' ? t.mine.claiming : t.mine.claimButton}
        </button>
      </form>
      <p role="status" className={`mt-2 text-base font-bold ${state === 'ok' ? 'text-leaf' : 'text-danger'}`}>
        {state === 'ok' ? t.mine.claimOk : state === 'bad' ? t.mine.claimBad : state === 'error' ? t.mine.error : ''}
      </p>
      <p className="mt-1 text-sm text-muted">{t.mine.noKeyNote}</p>
    </section>
  )
}
