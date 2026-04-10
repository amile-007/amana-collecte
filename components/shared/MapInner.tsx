'use client'

import { useRef, useEffect } from 'react'
import type { MapWrapperProps } from './MapWrapper'

export default function MapInner({
  markers,
  center = [33.5731, -7.5898],
  zoom = 12,
  height = '100%',
  className = '',
}: MapWrapperProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null)

  useEffect(() => {
    if (!mapRef.current) return
    let cancelled = false

    import('leaflet').then((mod) => {
      if (cancelled || !mapRef.current || leafletRef.current) return
      if ((mapRef.current as unknown as Record<string, unknown>)['_leaflet_id']) return

      const L = mod.default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, { center, zoom })
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(map)

      markers.forEach((m) => {
        const color = m.color ?? '#E30613'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:rotate(-45deg)"></div>`,
          iconSize:   [28, 28],
          iconAnchor: [14, 28],
        })
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map)
        if (m.label) {
          marker.bindPopup(`<div style="font-size:12px;min-width:140px"><p style="font-weight:600;margin:0 0 2px">${m.label}</p>${m.subLabel ? `<p style="color:#6B7280;margin:0">${m.subLabel}</p>` : ''}</div>`)
        }
      })

      if (markers.length > 1) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    })

    return () => {
      cancelled = true
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null }
    }
  }, [])

  return (
    <div ref={mapRef} style={{ height }} className={`w-full ${className}`} />
  )
}
