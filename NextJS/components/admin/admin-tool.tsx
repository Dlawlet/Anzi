'use client'

import 'mapbox-gl/dist/mapbox-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl'

// Moderator tool (owner only, desktop): trace the line of streets that wait for one, and fix street names.
// Everything the API returns is rendered as text. The token lives in memory only (typed again after a reload).
type AdminStreet = {
  id: string
  name: string
  lang: 'fr' | 'en'
  nameStatus: 'unnamed' | 'proposed' | 'accepted'
  nameSource: 'community' | 'osm' | 'official'
  lineStatus: 'waiting' | 'ready'
  quarter: string
  city: string
  placeCount: number
  anchor: [number, number]
  line: [number, number][] | null
  createdAt: string
}
type Queue = { waiting: AdminStreet[]; proposed: AdminStreet[] }
type Point = [number, number]
type Proposal = { line: Point[]; osmName: string; highway: string; lengthM: number; distanceM: number; sameName: boolean }

const empty = (): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [] })

const asLine = (points: Point[]) => ({
  type: 'FeatureCollection' as const,
  features: [
    ...(points.length > 1 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: points } }] : []),
    ...points.map((p, i) => ({ type: 'Feature' as const, properties: { n: i + 1 }, geometry: { type: 'Point' as const, coordinates: p } })),
  ],
})

export default function AdminTool() {
  const [token, setToken] = useState('')
  const [queue, setQueue] = useState<Queue | null>(null)
  const [selected, setSelected] = useState<AdminStreet | null>(null)
  const [draft, setDraft] = useState<Point[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [officialSource, setOfficialSource] = useState('')
  const [proposals, setProposals] = useState<Proposal[] | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const draftRef = useRef<Point[]>([])
  const selectedRef = useRef<AdminStreet | null>(null)

  const call = useCallback(
    async (path: string, body?: unknown) => {
      const res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, data }
    },
    [token]
  )

  // Test mode: this connection no longer has to stand at a house picked on the map (24 h, then it expires).
  async function trustMyIp(on: boolean) {
    setBusy(true)
    try {
      const { ok, status } = await call('/api/admin/trust-ip', { on })
      setMessage(ok ? (on ? 'This connection skips the "be at the house" check for 24 h.' : 'Test mode off for this connection.') : `Error ${status}.`)
    } finally {
      setBusy(false)
    }
  }

  async function loadQueue() {
    setBusy(true)
    setMessage('')
    try {
      const { ok, status, data } = await call('/api/admin/queue')
      if (!ok) {
        setQueue(null)
        setMessage(status === 401 ? 'Wrong token, or ADMIN_TOKEN is not set on the server.' : `Error ${status}.`)
        return
      }
      setQueue(data as Queue)
    } finally {
      setBusy(false)
    }
  }

  // Map: created once a street is selected for tracing (mapbox-gl is loaded only on this page).
  useEffect(() => {
    let cancelled = false
    let map: MapboxMap | null = null
    ;(async () => {
      if (!container.current) return
      const mapboxgl = (await import('mapbox-gl')).default
      if (cancelled || !container.current) return
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
      map = new mapboxgl.Map({
        container: container.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [11.5167, 3.8667],
        zoom: 12,
      })
      map.addControl(new mapboxgl.NavigationControl())
      map.on('load', () => {
        if (!map) return
        map.addSource('draft', { type: 'geojson', data: empty() })
        map.addSource('existing', { type: 'geojson', data: empty() })
        map.addLayer({ id: 'existing-line', type: 'line', source: 'existing', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#38bdf8', 'line-width': 4 } })
        map.addLayer({ id: 'draft-line', type: 'line', source: 'draft', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#f97316', 'line-width': 4 } })
        map.addLayer({ id: 'draft-points', type: 'circle', source: 'draft', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 6, 'circle-color': '#f97316', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } })
        map.addLayer({ id: 'draft-numbers', type: 'symbol', source: 'draft', filter: ['==', '$type', 'Point'], layout: { 'text-field': ['to-string', ['get', 'n']], 'text-offset': [0, -1.4], 'text-size': 13 }, paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.5 } })
      })
      map.on('click', (e) => {
        if (!map?.getSource('draft')) return
        if (!selectedRef.current || selectedRef.current.lineStatus !== 'waiting') return
        const next: Point[] = [...draftRef.current, [e.lngLat.lng, e.lngLat.lat]]
        draftRef.current = next
        setDraft(next)
      })
      mapRef.current = map
    })()
    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  // Keep the drawn line on the map.
  useEffect(() => {
    draftRef.current = draft
    const source = mapRef.current?.getSource('draft') as GeoJSONSource | undefined
    source?.setData(draft.length > 0 ? asLine(draft) : empty())
  }, [draft])

  function pick(street: AdminStreet) {
    setSelected(street)
    setDraft([])
    draftRef.current = []
    setNameInput(street.name)
    setLang(street.lang)
    setOfficialSource('')
    setMessage('')
    setProposals(null)
    if (street.lineStatus === 'waiting') autoTrace(street)
    const map = mapRef.current
    map?.flyTo({ center: street.anchor, zoom: 17 })
    const existing = map?.getSource('existing') as GeoJSONSource | undefined
    existing?.setData(street.line ? asLine(street.line) : empty())
  }

  // Asks OpenStreetMap for the road next to the street's point; the best proposal is drawn, to be checked.
  async function autoTrace(street: AdminStreet) {
    setBusy(true)
    try {
      const { ok, data } = await call(`/api/admin/streets/${street.id}/suggest-line`)
      if (!ok) {
        setProposals([])
        setMessage('Auto-trace unavailable (OpenStreetMap did not answer). Click the map to draw by hand.')
        return
      }
      const list = (data.proposals ?? []) as Proposal[]
      setProposals(list)
      if (list.length > 0) applyProposal(list[0])
    } finally {
      setBusy(false)
    }
  }

  function applyProposal(p: Proposal) {
    draftRef.current = p.line
    setDraft(p.line)
    const map = mapRef.current
    if (map && p.line.length > 0) map.flyTo({ center: p.line[Math.floor(p.line.length / 2)], zoom: 17 })
  }

  // Saves the line and, in the same click, the decision on the name (accept the proposal, or set the typed one).
  async function saveLine(withName = false) {
    if (!selected || draft.length < 2) return
    setBusy(true)
    try {
      const { ok, status, data } = await call(`/api/admin/streets/${selected.id}/line`, { line: draft })
      if (!ok) setMessage(status === 400 ? 'Line refused: 2 to 200 points, none farther than 3 km apart.' : `Error ${status}${data?.reason ? ` (${data.reason})` : ''}.`)
      else {
        let named = ''
        if (withName) {
          const name = nameInput.trim()
          const action = selected.nameStatus === 'proposed' && name === selected.name ? 'accept' : 'set'
          const res = await call(`/api/admin/streets/${selected.id}/name`, { action, name, lang, officialSource })
          named = res.ok ? ' Name validated.' : ` Name refused (${res.status}${res.data?.reason ? `, ${res.data.reason}` : ''}): fix it below.`
        }
        setMessage(`Line saved. ${data.numbered} place(s) numbered, ${data.skipped} left waiting (too far from the line).${named}`)
        setDraft([])
        setSelected(null)
        await loadQueue()
      }
    } finally {
      setBusy(false)
    }
  }

  async function nameAction(action: 'accept' | 'reject' | 'set' | 'official') {
    if (!selected) return
    setBusy(true)
    try {
      const { ok, status, data } = await call(`/api/admin/streets/${selected.id}/name`, { action, name: nameInput, lang, officialSource })
      if (!ok) setMessage(`Refused (${status}${data?.reason ? `, ${data.reason}` : data?.fields ? `, ${data.fields.join(', ')}` : ''}).`)
      else {
        setMessage('Done.')
        setSelected(null)
        await loadQueue()
      }
    } finally {
      setBusy(false)
    }
  }

  const label = (s: AdminStreet) => `${s.name || 'Unnamed'} · ${[s.quarter, s.city].filter(Boolean).join(', ')} · ${s.placeCount} place(s)`
  const input = 'rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100'
  const button = 'rounded bg-orange-500 px-4 py-2 font-semibold text-gray-900 disabled:opacity-50'
  const ghost = 'rounded border border-gray-500 px-4 py-2 text-gray-100 disabled:opacity-50'

  return (
    <div className="grid min-h-screen grid-cols-[22rem_1fr] bg-gray-900 text-gray-100">
      <aside className="space-y-4 overflow-y-auto p-4">
        <h1 className="text-xl font-bold">Anzi admin</h1>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            loadQueue()
          }}
        >
          <label className="sr-only" htmlFor="admin-token">Admin token</label>
          <input id="admin-token" type="password" autoComplete="off" className={`${input} min-w-0 flex-1`} placeholder="ADMIN_TOKEN" value={token} onChange={(e) => setToken(e.target.value)} />
          <button className={button} disabled={busy || token.length < 8}>Load</button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button className={ghost} disabled={busy || token.length < 8} onClick={() => trustMyIp(true)}>Test mode: trust my IP (24 h)</button>
          <button className={ghost} disabled={busy || token.length < 8} onClick={() => trustMyIp(false)}>Stop</button>
        </div>
        {message && <p role="status" className="rounded bg-gray-800 p-3 text-sm">{message}</p>}

        {queue && (
          <>
            <section>
              <h2 className="mb-2 font-semibold">Waiting for a line ({queue.waiting.length})</h2>
              <ul className="space-y-1">
                {queue.waiting.map((s) => (
                  <li key={s.id}>
                    <button className={`w-full rounded px-3 py-2 text-left ${selected?.id === s.id ? 'bg-orange-500 text-gray-900' : 'bg-gray-800'}`} onClick={() => pick(s)}>{label(s)}</button>
                  </li>
                ))}
                {queue.waiting.length === 0 && <li className="text-sm text-gray-400">Nothing waiting. A street shows up here when someone creates an address on a new street (addresses made before the refactor are not streets).</li>}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 font-semibold">Provisional names ({queue.proposed.length})</h2>
              <ul className="space-y-1">
                {queue.proposed.map((s) => (
                  <li key={s.id}>
                    <button className={`w-full rounded px-3 py-2 text-left ${selected?.id === s.id ? 'bg-orange-500 text-gray-900' : 'bg-gray-800'}`} onClick={() => pick(s)}>{label(s)}</button>
                  </li>
                ))}
                {queue.proposed.length === 0 && <li className="text-sm text-gray-400">No name to review.</li>}
              </ul>
            </section>
          </>
        )}

        {selected && (
          <section className="space-y-3 rounded border border-gray-700 p-3">
            <h2 className="font-semibold">{label(selected)}</h2>
            {selected.lineStatus === 'waiting' ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  {proposals === null ? 'Looking for the road on OpenStreetMap...' : proposals.length > 0 ? 'Orange = proposed line from OpenStreetMap. Check it, fix it by clicking the map, then save.' : 'No road found next to the point: click the map along the street.'}{' '}
                  Numbers go up in the direction of the line ({draft.length} point(s)).
                </p>
                {proposals && proposals.length > 0 && (
                  <ul className="space-y-1">
                    {proposals.map((p, i) => (
                      <li key={i}>
                        <button className="w-full rounded bg-gray-800 px-3 py-2 text-left text-sm" onClick={() => applyProposal(p)}>
                          {p.osmName || '(no name)'} · {p.highway} · {p.lengthM} m · {p.distanceM} m away{p.sameName ? ' · same name' : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {proposals && proposals[0]?.osmName && (
                  <button className={ghost} onClick={() => setNameInput(proposals[0].osmName.slice(0, 24))}>Use name &quot;{proposals[0].osmName}&quot;</button>
                )}
                <div className="flex flex-wrap gap-2">
                  <button className={ghost} disabled={busy} onClick={() => autoTrace(selected)}>Auto-trace</button>
                  <button className={ghost} disabled={draft.length < 2} onClick={() => setDraft([...draft].reverse())}>Reverse</button>
                  <button className={ghost} disabled={draft.length === 0} onClick={() => setDraft(draft.slice(0, -1))}>Undo</button>
                  <button className={ghost} disabled={draft.length === 0} onClick={() => setDraft([])}>Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={button} disabled={busy || draft.length < 2 || nameInput.trim().length < 2} onClick={() => saveLine(true)}>Save line + validate name</button>
                  <button className={ghost} disabled={busy || draft.length < 2} onClick={() => saveLine(false)}>Save line only</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300">Line drawn (blue). Numbers are issued.</p>
            )}
            <div className="space-y-2">
              <label className="block text-sm" htmlFor="street-name">Street name</label>
              <input id="street-name" className={`${input} w-full`} value={nameInput} maxLength={24} onChange={(e) => setNameInput(e.target.value)} />
              <select aria-label="Language of the name" className={`${input} w-full`} value={lang} onChange={(e) => setLang(e.target.value as 'fr' | 'en')}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
              <label className="block text-sm" htmlFor="official-source">Official source (only for an official name)</label>
              <input id="official-source" className={`${input} w-full`} value={officialSource} maxLength={200} onChange={(e) => setOfficialSource(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button className={button} disabled={busy || selected.nameStatus !== 'proposed'} onClick={() => nameAction('accept')}>Accept</button>
                <button className={ghost} disabled={busy || nameInput.length < 2} onClick={() => nameAction('set')}>Set name</button>
                <button className={ghost} disabled={busy || nameInput.length < 2 || officialSource.length < 3} onClick={() => nameAction('official')}>Set official</button>
                <button className={ghost} disabled={busy || selected.nameStatus === 'unnamed'} onClick={() => nameAction('reject')}>Remove name</button>
              </div>
            </div>
          </section>
        )}
      </aside>
      <div ref={container} className="min-h-screen" aria-label="Map" />
    </div>
  )
}
