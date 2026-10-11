'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type GpsFix = { lat: number; lng: number; accuracyM: number }
export type GpsError = 'denied' | 'unavailable' | 'timeout' | 'unsupported'
export type GpsState =
  | { status: 'idle' }
  | { status: 'locating'; best: GpsFix | null }
  | { status: 'done'; fix: GpsFix }
  | { status: 'error'; error: GpsError }

const GOOD_ENOUGH_M = 15 // stop early when the phone is this sure
const SETTLE_MS = 12000 // otherwise keep the best reading seen for this long
const TIMEOUT_MS = 20000

// Watches the position for a few seconds and keeps the most accurate reading (the first fix is often coarse).
export function useGps() {
  const [state, setState] = useState<GpsState>({ status: 'idle' })
  const watchId = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const best = useRef<GpsFix | null>(null)

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    if (timer.current) clearTimeout(timer.current)
    watchId.current = null
    timer.current = null
  }, [])

  useEffect(() => stop, [stop])

  const finish = useCallback(() => {
    stop()
    setState(best.current ? { status: 'done', fix: best.current } : { status: 'error', error: 'timeout' })
  }, [stop])

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'error', error: 'unsupported' })
      return
    }
    stop()
    best.current = null
    setState({ status: 'locating', best: null })

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy }
        if (!best.current || fix.accuracyM < best.current.accuracyM) best.current = fix
        if (best.current.accuracyM <= GOOD_ENOUGH_M) return finish()
        setState({ status: 'locating', best: best.current })
        if (!timer.current) timer.current = setTimeout(finish, SETTLE_MS)
      },
      (err) => {
        // A timeout after at least one reading is not a failure: use what we have.
        if (best.current) return finish()
        stop()
        setState({ status: 'error', error: err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable' })
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 }
    )
  }, [finish, stop])

  const reset = useCallback(() => {
    stop()
    best.current = null
    setState({ status: 'idle' })
  }, [stop])

  return { state, start, reset }
}
