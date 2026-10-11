'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useI18n } from '@/i18n/provider'
import { fmt } from '@/i18n/lang'
import { appleUrl, coordsText, detectPlatform, geoUrl, googleDirUrl, platformOrder, wazeUrl, type GoRow } from '@/utils/mapsLinks'
import { ChevronIcon, CopyIcon, NavigateIcon, PhoneIcon, PinHouseIcon, RoadIcon } from './icons'

// The last row used moves to the top. A convenience only: storage can be blocked and nothing depends on it.
const LAST_KEY = 'anzi.go.last.v1'
const readLast = () => {
  try {
    return window.localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
const writeLast = (row: GoRow) => {
  try {
    window.localStorage.setItem(LAST_KEY, row)
  } catch {
    // blocked or full: ignore
  }
}

const subscribeOnline = (notify: () => void) => {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => {
    window.removeEventListener('online', notify)
    window.removeEventListener('offline', notify)
  }
}
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)

const ICONS: Record<GoRow, typeof NavigateIcon> = { phone: PhoneIcon, google: NavigateIcon, waze: RoadIcon, apple: PinHouseIcon, copy: CopyIcon }
const rowClass = 'flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-clay'
const FOCUSABLE = 'a[href], button:not([disabled])'

// Bottom sheet that hands the position to a maps app (docs/design-2026-10.md section 4.4). Controlled: the caller
// owns the "Y aller" button and passes `open`. The content mounts on open, so phone and storage are read then.
export default function GoSheet(props: { lat: number; lng: number; label: string; open: boolean; onClose: () => void }) {
  return props.open ? <Sheet {...props} /> : null
}

function Sheet({ lat, lng, label, onClose }: { lat: number; lng: number; label: string; onClose: () => void }) {
  const { t } = useI18n()
  const online = useOnline()
  const [rows] = useState(() => platformOrder(detectPlatform(navigator.userAgent, navigator.maxTouchPoints), readLast()))
  const [message, setMessage] = useState('')
  const dialog = useRef<HTMLDivElement>(null)
  const at = { lat, lng }

  // Focus moves into the sheet, Escape and Tab stay inside it, the page behind does not scroll; all undone on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const root = dialog.current
    root?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return onClose()
      if (event.key !== 'Tab' || !root) return
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scroll
      opener?.focus?.()
    }
  }, [onClose])

  async function copy() {
    writeLast('copy')
    try {
      await navigator.clipboard.writeText(coordsText(at))
      setMessage(t.go.copied)
    } catch {
      // Clipboard can be blocked: show the text so it can be copied by hand.
      setMessage(fmt(t.go.copyFailed, { pos: coordsText(at) }))
    }
  }

  const row = (id: GoRow) => {
    const Icon = ICONS[id]
    const text = t.go[id]
    const hint = t.go[`${id}Hint` as 'phoneHint']
    const web = id === 'google' || id === 'waze' || id === 'apple'
    const body = (
      <>
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-sun-50 text-earth">
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight text-night-900">{text}</span>
          <span className="block text-base leading-snug text-muted">{web && !online ? t.go.needsNetwork : hint}</span>
        </span>
        <ChevronIcon className="h-5 w-5 flex-none text-muted" />
      </>
    )
    if (id === 'copy') {
      return <button key={id} type="button" onClick={copy} className={rowClass}>{body}</button>
    }
    if (web && !online) {
      return <div key={id} aria-disabled="true" className={`${rowClass} opacity-60`}>{body}</div>
    }
    const href = id === 'phone' ? geoUrl(at, label) : id === 'google' ? googleDirUrl(at) : id === 'waze' ? wazeUrl(at) : appleUrl(at)
    return (
      <a
        key={id}
        href={href}
        {...(id === 'phone' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        onClick={() => writeLast(id)}
        className={rowClass}
      >
        {body}
      </a>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-night-900/55" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="go-title"
        className="relative max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5"
      >
        <h2 id="go-title" className="text-xl font-extrabold text-night-900">{t.go.title}</h2>
        <p className="mb-2 break-words text-base text-muted">{label}</p>
        <div className="space-y-1">{rows.map(row)}</div>
        <p role="status" className="min-h-6 px-2 pt-2 text-base font-bold text-night-900">{message}</p>
        <button type="button" onClick={onClose} className="btn btn-outline mt-2">{t.go.close}</button>
      </div>
    </div>
  )
}
