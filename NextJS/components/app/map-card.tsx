'use client'

import { Component, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/provider'
import { toPercent, type LngLat, type MapView } from '@/utils/staticMap'
import type { HomeStreet, HomeTag } from '@/utils/homeMap'
import { ExpandIcon, ShrinkIcon } from './icons'

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

// Wraps the server-rendered static preview (children). Tapping "Agrandir" swaps it for the live map.
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
        {open ? (
          <div className="h-[380px]">
            <MapBoundary onFail={fail}>
              <InteractiveMap center={view.center} zoom={view.zoom} streets={streets} tags={tags} label={label} onFail={fail} />
            </MapBoundary>
          </div>
        ) : (
          children
        )}
        {showYou && youAt && (
          <span
            aria-hidden="true"
            className="you-dot absolute z-[2] h-5 w-5 rounded-full border-[3px] border-white bg-you shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
            style={{ left: `${youAt.left}%`, top: `${youAt.top}%`, transform: 'translate(-50%, -50%)' }}
          />
        )}
        <button type="button" onClick={toggle} aria-expanded={open} className="map-btn bottom-2.5 right-2.5">
          {open ? <ShrinkIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
          {open ? t.home.mapClose : t.home.mapExpand}
        </button>
      </div>
      {(notice || (lowData && !open)) && (
        <p role="status" className="px-3.5 pt-3 text-base text-muted">{notice ?? t.home.mapData}</p>
      )}
    </>
  )
}
