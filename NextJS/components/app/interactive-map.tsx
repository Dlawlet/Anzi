'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { HomeStreet, HomeTag } from '@/utils/homeMap'
import type { LngLat } from '@/utils/staticMap'

// A searched address: the map recentres on it and a teardrop pin with the house number marks it.
export type MapPinTarget = { lng: number; lat: number; number: string }

// A Mapbox marker made of plain DOM: the number is set as text, never as HTML.
function pinElement(number: string) {
  const el = document.createElement('div')
  el.style.cssText = 'width:50px;height:66px;pointer-events:none'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 50 66')
  svg.setAttribute('width', '50')
  svg.setAttribute('height', '66')
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  body.setAttribute('d', 'M25 64C25 64 4 40 4 24a21 21 0 0 1 42 0c0 16-21 40-21 40z')
  body.setAttribute('fill', '#42210B')
  const disc = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  disc.setAttribute('cx', '25')
  disc.setAttribute('cy', '24')
  disc.setAttribute('r', '15')
  disc.setAttribute('fill', '#FFF3E3')
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  label.setAttribute('x', '25')
  label.setAttribute('y', '30')
  label.setAttribute('text-anchor', 'middle')
  label.setAttribute('font-size', number.length > 3 ? '12' : '17')
  label.setAttribute('font-weight', '800')
  label.setAttribute('fill', '#42210B')
  label.textContent = number
  svg.append(body, disc, label)
  el.append(svg)
  return el
}

// The only importer of mapbox-gl on Home. It is loaded with next/dynamic after the user taps "Agrandir",
// so first load carries none of it. Same centre and zoom as the static image: no jump when it opens.
export default function InteractiveMap({
  center,
  zoom,
  streets,
  tags,
  label,
  pin,
  adding,
  onTarget,
  onFail,
}: {
  center: LngLat
  zoom: number
  streets: HomeStreet[]
  tags: HomeTag[]
  label: string
  pin?: MapPinTarget | null
  adding?: boolean // "add an address" mode: a tap puts a movable pin on the house
  onTarget?: (at: LngLat) => void
  onFail: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const firstPin = useRef(pin)
  const targetRef = useRef<mapboxgl.Marker | null>(null)
  const addingRef = useRef(Boolean(adding))
  const onTargetRef = useRef(onTarget)
  useEffect(() => {
    addingRef.current = Boolean(adding)
    onTargetRef.current = onTarget
  }, [adding, onTarget])

  useEffect(() => {
    if (!container.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({ container: container.current, style: 'mapbox://styles/mapbox/streets-v12', center, zoom })
    } catch {
      onFail() // no WebGL, or no token
      return
    }
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    // The pin the map opens with (a find result); later searches move it from the effect below.
    if (firstPin.current) {
      const first = firstPin.current
      markerRef.current = new mapboxgl.Marker({ element: pinElement(first.number), anchor: 'bottom' }).setLngLat([first.lng, first.lat]).addTo(map)
    }
    // Add mode: a tap drops (or moves) the pin; the marker can then be dragged onto the exact house.
    map.on('click', (event) => {
      if (!addingRef.current) return
      const at: LngLat = [event.lngLat.lng, event.lngLat.lat]
      if (!targetRef.current) {
        const marker = new mapboxgl.Marker({ element: pinElement(''), anchor: 'bottom', draggable: true }).setLngLat(at).addTo(map)
        marker.getElement().style.pointerEvents = 'auto'
        marker.on('dragend', () => {
          const p = marker.getLngLat()
          onTargetRef.current?.([p.lng, p.lat])
        })
        targetRef.current = marker
      } else targetRef.current.setLngLat(at)
      onTargetRef.current?.(at)
    })
    map.on('error', (event) => {
      // A failed style or token means a blank map: say so instead of leaving a grey box.
      if (!map.isStyleLoaded()) {
        console.error('map error', event.error?.message)
        onFail()
      }
    })

    map.on('load', () => {
      map.addSource('anzi-streets', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: streets
            .filter((s) => s.line.length >= 2)
            .map((s) => ({ type: 'Feature', properties: { name: s.name, provisional: s.provisional }, geometry: { type: 'LineString', coordinates: s.line } })),
        },
      })
      map.addSource('anzi-tags', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: tags.map((t) => ({ type: 'Feature', properties: { number: t.number }, geometry: { type: 'Point', coordinates: t.at } })),
        },
      })
      map.addLayer({ id: 'anzi-street-casing', type: 'line', source: 'anzi-streets', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#42210B', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 5, 17, 11] } })
      map.addLayer({ id: 'anzi-street-line', type: 'line', source: 'anzi-streets', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FF8506', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 7] } })
      map.addLayer({
        id: 'anzi-street-name',
        type: 'symbol',
        source: 'anzi-streets',
        filter: ['!=', ['get', 'name'], ''],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 13 },
        paint: { 'text-color': '#42210B', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      })
      // Number tags only at street zoom; this map has no clusters, so the two never show together.
      map.addLayer({ id: 'anzi-tag-dot', type: 'circle', source: 'anzi-tags', minzoom: 15, paint: { 'circle-radius': 13, 'circle-color': '#FF8506', 'circle-stroke-color': '#42210B', 'circle-stroke-width': 1.5 } })
      map.addLayer({
        id: 'anzi-tag-number',
        type: 'symbol',
        source: 'anzi-tags',
        minzoom: 15,
        layout: { 'text-field': ['get', 'number'], 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 13, 'text-allow-overlap': true },
        paint: { 'text-color': '#151719' },
      })
    })

    return () => {
      targetRef.current?.remove()
      targetRef.current = null
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
      map.remove()
    }
    // The map is created once per opening; props are the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Leaving add mode takes the pin away.
  useEffect(() => {
    if (adding) return
    targetRef.current?.remove()
    targetRef.current = null
  }, [adding])

  // A new search result: move the pin and recentre the map on it.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !pin || pin === firstPin.current) return
    markerRef.current?.remove()
    markerRef.current = new mapboxgl.Marker({ element: pinElement(pin.number), anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map)
    map.flyTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), 17), essential: true })
  }, [pin])

  return <div ref={container} role="region" aria-label={label} className="h-full w-full" />
}
