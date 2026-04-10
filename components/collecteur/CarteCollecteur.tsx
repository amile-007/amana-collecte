'use client'

import { useRef, useEffect } from 'react'

interface MissionPoint {
  id: string
  reference: string
  adresse: string
  statut: string
  lat: number
  lng: number
}

const STATUT_COLOR: Record<string, string> = {
  affectee: '#3B82F6',
  en_cours: '#F59E0B',
  collectee: '#10B981',
  anomalie: '#EF4444',
}

export default function CarteCollecteur({ missions }: { missions: MissionPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null)

  useEffect(() => {
    if (!mapRef.current) return
    let cancelled = false

    import('leaflet').then((module) => {
      if (cancelled || !mapRef.current || leafletRef.current) return
      if ((mapRef.current as unknown as Record<string, unknown>)['_leaflet_id']) return

      const L = module.default

      // Fix default icon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center: [number, number] = missions.length > 0
        ? [missions[0].lat, missions[0].lng]
        : [33.5731, -7.5898]

      const map = L.map(mapRef.current, { center, zoom: 13, zoomControl: true })
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      missions.forEach((m) => {
        const color = STATUT_COLOR[m.statut] ?? '#6B7280'
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:${color};border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            transform:rotate(-45deg);
          "></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })

        L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-size:12px;min-width:160px">
              <p style="font-weight:600;margin:0 0 4px">${m.reference}</p>
              <p style="color:#6B7280;margin:0">${m.adresse}</p>
            </div>
          `)
      })

      if (missions.length > 1) {
        const bounds = L.latLngBounds(missions.map((m) => [m.lat, m.lng]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    })

    return () => {
      cancelled = true
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div>
        <h1 className="text-base font-bold text-gray-900">Mes missions du jour</h1>
        <p className="text-xs text-gray-500 mt-0.5">{missions.length} point{missions.length !== 1 ? 's' : ''} sur la carte</p>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUT_COLOR).map(([statut, color]) => (
          <div key={statut} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            {statut.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 min-h-[300px]">
        {missions.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-gray-50 text-sm text-gray-400">
            Aucune mission avec coordonnées GPS
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>
    </div>
  )
}
