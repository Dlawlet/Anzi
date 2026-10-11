'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { HomeStreet, HomeTag } from '@/utils/homeMap'
import type { LngLat } from '@/utils/staticMap'

// The only importer of mapbox-gl on Home. It is loaded with next/dynamic after the user taps "Agrandir",
// so first load carries none of it. Same centre and zoom as the static image: no jump when it opens.
export default function InteractiveMap({
  center,
  zoom,
  streets,
  tags,
  label,
  onFail,
}: {
  center: LngLat
  zoom: number
  streets: HomeStreet[]
  tags: HomeTag[]
  label: string
  onFail: () => void
}) {
  const container = useRef<HTMLDivElement>(null)

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
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
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

    return () => map.remove()
    // The map is created once per opening; props are the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={container} role="region" aria-label={label} className="h-full w-full" />
}
