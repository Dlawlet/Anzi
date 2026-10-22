'use client'

import { Component, useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useI18n } from '@/i18n/provider'
import { toPercent, type LngLat, type MapView } from '@/utils/staticMap'
import type { HomeStreet, HomeTag } from '@/utils/homeMap'
import { hitLine, hitTitle, searchAddress, searchLocal, type Hit } from '@/utils/findClient'
import { readLocalPlaces } from '@/utils/localPlaces'
import GoSheet from './go-sheet'
import { StreetSuggestions, useStreetSuggestions } from './street-suggestions'
import type { MapPinTarget } from './interactive-map'
import { CloseIcon, CrosshairIcon, ExpandIcon, NavigateIcon, SearchIcon, ShrinkIcon } from './icons'
import { primaryButton, secondaryButton } from './ui-classes'

function MapLoading() {
  const { t } = useI18n()
  return <div className="grid h-full place-items-center bg-sand text-base text-muted">{t.home.mapLoading}</div>
}

// Mapbox GL (about 260 kB gzip) is only requested when this chunk is first rendered, i.e. after the tap.
const InteractiveMap = dynamic(() => import('./interactive-map'), { ssr: false, loading: () => <MapLoading /> })

// A chunk that cannot be fetched (connection lost) must not take the whole page down.
class MapBoundary extends Component<{ onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

type Connection = { saveData?: boolean; effectiveType?: string }
const connection = (): Connection | undefined => (navigator as Navigator & { connection?: Connection }).connection

const pinOf = (hit: Hit): MapPinTarget => ({ lng: hit.lng, lat: hit.lat, number: hit.number != null ? `${hit.number}${hit.suffix}` : '' })

// Wraps the server-rendered static preview (children). Tapping "Agrandir" opens the live map full screen on top
// of the page (the card stays where it is, so nothing jumps), with "Réduire" and Escape to come back.
// The search bar on the full-screen map answers on the map itself: it recentres on the result, drops a pin with the
// number and offers "Y aller" (it does not leave the map). `hit` is the address the page already shows, if any.
export default function MapCard({
  view,
  streets,
  tags,
  label,
  hit,
  children,
}: {
  view: MapView
  streets: HomeStreet[]
  tags: HomeTag[]
  label: string
  hit?: Hit | null
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [lowData, setLowData] = useState(false)
  const [you, setYou] = useState<LngLat | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  // Search on the full-screen map: the address on show (the page's own to start with), the other answers, a message.
  const [current, setCurrent] = useState<Hit | null>(hit ?? null)
  const [pin, setPin] = useState<MapPinTarget | null>(() => (hit ? pinOf(hit) : null))
  const [others, setOthers] = useState<Hit[]>([])
  const [mapMessage, setMapMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const { items: suggestions, accept, dismiss } = useStreetSuggestions(query)
  const [goOpen, setGoOpen] = useState(false)
  const closeGo = useCallback(() => setGoOpen(false), [])
  // "Add an address": tap a house, then start the create flow with that position as the target.
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [target, setTarget] = useState<LngLat | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      const c = connection()
      setLowData(Boolean(c?.saveData) || c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g')
    })
    // "You are here" only when permission was already granted: Home never asks for the position.
    navigator.permissions?.query({ name: 'geolocation' }).then((status) => {
      if (cancelled || status.state !== 'granted') return
      navigator.geolocation.getCurrentPosition(
        (pos) => !cancelled && setYou([pos.coords.longitude, pos.coords.latitude]),
        () => {},
        { maximumAge: 300000, timeout: 8000 }
      )
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Full screen: focus goes to "Réduire", Escape closes, the page behind does not scroll; all undone on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Escape closes the "Y aller" sheet first (it handles the key itself), then the map.
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !document.querySelector('#go-title') && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scroll
      opener?.focus?.()
    }
  }, [open])

  const toggle = () => {
    if (open) {
      setAdding(false)
      setTarget(null)
      setOpen(false)
      return
    }
    if (!navigator.onLine) {
      setNotice(t.home.mapOffline)
      return
    }
    setNotice(null)
    setOpen(true)
  }

  const fail = () => {
    setOpen(false)
    setNotice(t.home.mapFailed)
  }

  function show(next: Hit) {
    setCurrent(next)
    setPin(pinOf(next))
    setMapMessage('')
  }

  async function runSearch(text: string) {
    const q = text.trim()
    if (!q || searching) return
    setSearching(true)
    setMapMessage('')
    const own = searchLocal(q, readLocalPlaces())
    const outcome = navigator.onLine ? await searchAddress(q) : null
    setSearching(false)
    const hits = outcome?.status === 'ok' ? outcome.hits : own
    setOthers(hits.length > 1 ? hits.slice(0, 5) : [])
    if (hits.length > 0) show(hits[0])
    else if (outcome?.status === 'error') setMapMessage(t.find.errors[outcome.reason])
    else setMapMessage(outcome ? t.find.mapNone : t.home.mapOffline)
  }

  // The cross on the result card: forget the answer and take the pin off the map.
  function clearResult() {
    setCurrent(null)
    setPin(null)
    setOthers([])
    setMapMessage('')
    setGoOpen(false)
  }

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dismiss()
    void runSearch(query)
  }

  const youAt = you ? toPercent(view, you) : null
  const showYou = !open && youAt && youAt.left >= 0 && youAt.left <= 100 && youAt.top >= 0 && youAt.top <= 100

  return (
    <>
      <div className="relative">
        {children}
        {open && createPortal(
          <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[60] bg-sand">
            <MapBoundary onFail={fail}>
              <InteractiveMap center={pin ? [pin.lng, pin.lat] : view.center} zoom={view.zoom} streets={streets} tags={tags} label={label} pin={pin} adding={adding} onTarget={setTarget} onFail={fail} />
            </MapBoundary>
            <div className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[2] flex items-center gap-2">
              <button ref={closeButton} type="button" onClick={toggle} className="map-btn !static flex-none">
                <ShrinkIcon className="h-5 w-5" />
                {t.home.mapClose}
              </button>
              {/* Like a maps app: the search stays on top of the map and answers on the map. */}
              <div className="relative min-w-0 flex-1 md:max-w-md">
                <form onSubmit={search} role="search" className="flex h-12 items-center gap-1 rounded-full bg-white pl-4 pr-1.5 shadow-warm2">
                  <input
                    ref={searchInput}
                    name="q"
                    type="search"
                    required
                    maxLength={80}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={t.home.searchLabel}
                    placeholder={t.home.searchPlaceholder}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-night-900 placeholder:text-muted focus:ring-0"
                  />
                  <button type="submit" disabled={searching} aria-label={t.home.searchButton} className="grid h-10 w-10 flex-none place-items-center rounded-full bg-night-900 text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun disabled:opacity-60">
                    <SearchIcon className="h-5 w-5" />
                  </button>
                </form>
                {/* Suggestions float over the map under the bar; a place is a finished answer, a street waits for its number. */}
                <div className="absolute inset-x-0 top-full max-h-[50vh] overflow-y-auto rounded-[14px] shadow-warm2">
                  <StreetSuggestions
                    items={suggestions}
                    label={t.home.searchLabel}
                    onPick={(item) => {
                      const next = accept(item)
                      setQuery(next)
                      if (item.map) void runSearch(next)
                      else searchInput.current?.focus()
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={`absolute left-3 z-[1] md:left-4 ${current || mapMessage ? 'bottom-[max(11.5rem,env(safe-area-inset-bottom))]' : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]'}`}>
              {!adding && (
                <button type="button" onClick={() => setAdding(true)} className="map-btn !static">
                  <CrosshairIcon className="h-5 w-5" />
                  {t.home.addHere}
                </button>
              )}
            </div>
            {adding && (
              <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[2] mx-auto max-w-md rounded-3xl bg-white p-3.5 shadow-warm2">
                <p role="status" className="text-base font-bold text-night-900">{t.home.addHint}</p>
                <button
                  type="button"
                  disabled={!target}
                  onClick={() => target && router.push(`/create?lat=${target[1].toFixed(6)}&lng=${target[0].toFixed(6)}`)}
                  className={`${primaryButton} mt-3`}
                >
                  {t.home.addGo}
                </button>
                <button type="button" onClick={() => { setAdding(false); setTarget(null) }} className={`${secondaryButton} mt-2`}>
                  {t.home.addCancel}
                </button>
              </div>
            )}
            <div className={`absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[2] mx-auto max-w-md rounded-3xl bg-white p-3.5 shadow-warm2 ${(current || mapMessage) && !adding ? '' : 'hidden'}`}>
              <button type="button" onClick={clearResult} aria-label={t.go.close} className="absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-full text-night-900 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun">
                <CloseIcon className="h-6 w-6" />
              </button>
              <p role="status" className={mapMessage ? 'pr-10 text-base font-bold text-night-900' : 'sr-only'}>{mapMessage}</p>
              {current && !mapMessage && (
                <>
                  <p data-testid="map-result" className="break-words pr-10 text-[19px] font-extrabold leading-snug text-night-900">{hitTitle(current, t.card)}</p>
                  <p className="break-words text-base text-muted">{[current.quarter, current.city].filter(Boolean).join(' · ')}</p>
                  {others.length > 1 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {others.map((other) => (
                        <li key={other.key}>
                          <button type="button" aria-pressed={other.key === current.key} onClick={() => show(other)} className="inline-flex min-h-11 items-center rounded-full border-2 border-field px-3 text-base font-bold aria-pressed:border-clay aria-pressed:bg-sun-50">
                            {hitLine(other, t.card)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={() => setGoOpen(true)} className={`${secondaryButton} mt-3`}>
                    <NavigateIcon className="h-6 w-6" />
                    {t.go.title}
                  </button>
                </>
              )}
            </div>
            {current && <GoSheet lat={current.lat} lng={current.lng} label={hitLine(current, t.card)} open={goOpen} onClose={closeGo} />}
          </div>,
          // Portal: the card is its own stacking context, which would keep the map under the bottom bar.
          document.body
        )}
        {showYou && youAt && (
          <span
            aria-hidden="true"
            className="you-dot absolute z-[2] h-5 w-5 rounded-full border-[3px] border-white bg-you shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
            style={{ left: `${youAt.left}%`, top: `${youAt.top}%`, transform: 'translate(-50%, -50%)' }}
          />
        )}
        <button type="button" onClick={toggle} aria-expanded={open} className="map-btn bottom-2.5 right-2.5">
          <ExpandIcon className="h-5 w-5" />
          {t.home.mapExpand}
        </button>
      </div>
      {(notice || (lowData && !open)) && (
        <p role="status" className="px-3.5 pt-3 text-base text-muted">{notice ?? t.home.mapData}</p>
      )}
    </>
  )
}
