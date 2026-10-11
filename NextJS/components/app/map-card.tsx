'use client'

import { Component, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { useI18n } from '@/i18n/provider'
import { toPercent, type LngLat, type MapView } from '@/utils/staticMap'
import type { HomeStreet, HomeTag } from '@/utils/homeMap'
import { ExpandIcon, SearchIcon, ShrinkIcon } from './icons'

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

// Wraps the server-rendered static preview (children). Tapping "Agrandir" opens the live map full screen on top
// of the page (the card stays where it is, so nothing jumps), with "Réduire" and Escape to come back.
export default function MapCard({
  view,
  streets,
  tags,
  label,
  children,
}: {
  view: MapView
  streets: HomeStreet[]
  tags: HomeTag[]
  label: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [lowData, setLowData] = useState(false)
  const [you, setYou] = useState<LngLat | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

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
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scroll
      opener?.focus?.()
    }
  }, [open])

  const toggle = () => {
    if (open) {
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

  const youAt = you ? toPercent(view, you) : null
  const showYou = !open && youAt && youAt.left >= 0 && youAt.left <= 100 && youAt.top >= 0 && youAt.top <= 100

  return (
    <>
      <div className="relative">
        {children}
        {open && createPortal(
          <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[60] bg-sand">
            <MapBoundary onFail={fail}>
              <InteractiveMap center={view.center} zoom={view.zoom} streets={streets} tags={tags} label={label} onFail={fail} />
            </MapBoundary>
            <div className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[2] flex items-center gap-2">
              <button ref={closeButton} type="button" onClick={toggle} className="map-btn !static flex-none">
                <ShrinkIcon className="h-5 w-5" />
                {t.home.mapClose}
              </button>
              {/* Like a maps app: the search stays on top of the map. It opens the result page (GET /find?q=). */}
              <form action="/find" method="get" role="search" className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-full bg-white pl-4 pr-1.5 shadow-warm2 md:max-w-md">
                <input
                  name="q"
                  type="search"
                  required
                  maxLength={80}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t.home.searchLabel}
                  placeholder={t.home.searchPlaceholder}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-night-900 placeholder:text-muted focus:ring-0"
                />
                <button type="submit" aria-label={t.home.searchButton} className="grid h-10 w-10 flex-none place-items-center rounded-full bg-night-900 text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun">
                  <SearchIcon className="h-5 w-5" />
                </button>
              </form>
            </div>
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
