'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import 'leaflet/dist/leaflet.css'

interface SuiviGPSProps {
  lat: number | null
  lng: number | null
  collecteurId: string | null
  collecteurNom?: string
  updatedAt?: string | null
}

export default function SuiviGPS({
  lat: initialLat,
  lng: initialLng,
  collecteurId,
  collecteurNom,
  updatedAt: initialUpdatedAt,
}: SuiviGPSProps) {
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null)
  const markerRef = useRef<unknown>(null)

  // Initialiser la carte Leaflet
  useEffect(() => {
    if (!mapRef.current) return
    let cancelled = false

    import('leaflet').then((module) => {
      if (cancelled || !mapRef.current || leafletRef.current) return
      if ((mapRef.current as unknown as Record<string, unknown>)['_leaflet_id']) return

      const L = module.default
      const center: [number, number] = lat && lng ? [lat, lng] : [33.5731, -7.5898]
      const map = L.map(mapRef.current, { center, zoom: lat ? 15 : 12, zoomControl: true })
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      if (lat && lng) {
        const icon = L.divIcon({
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#CC0000;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        const marker = L.marker([lat, lng], { icon }).addTo(map)
        if (collecteurNom) marker.bindPopup(collecteurNom)
        markerRef.current = marker
      }
    })

    return () => {
      cancelled = true
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
        markerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mettre à jour le marqueur et re-centrer quand la position change (Realtime)
  useEffect(() => {
    if (!lat || !lng || !leafletRef.current) return

    import('leaflet').then((module) => {
      const L = module.default
      if (!leafletRef.current) return

      if (markerRef.current) {
        ;(markerRef.current as ReturnType<typeof L.marker>).setLatLng([lat, lng])
      } else {
        const icon = L.divIcon({
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#CC0000;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        const marker = L.marker([lat, lng], { icon }).addTo(leafletRef.current!)
        if (collecteurNom) marker.bindPopup(collecteurNom)
        markerRef.current = marker
      }

      leafletRef.current.flyTo([lat, lng], 15, { animate: true, duration: 1 })
    })
  }, [lat, lng, collecteurNom])

  // Supabase Realtime : écouter les mises à jour de position du collecteur
  useEffect(() => {
    if (!collecteurId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`suivi_gps:${collecteurId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collecteurs',
          filter: `id=eq.${collecteurId}`,
        },
        (payload) => {
          const c = payload.new as {
            position_lat: number | null
            position_lng: number | null
            position_updated_at: string
          }
          if (c.position_lat && c.position_lng) {
            setLat(c.position_lat)
            setLng(c.position_lng)
            setUpdatedAt(c.position_updated_at)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [collecteurId])

  return (
    <div className="flex flex-col gap-2">
      {/* Indicateur live */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${lat ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
        />
        <span className="text-xs font-medium text-gray-600">
          {lat ? 'Suivi GPS en direct' : 'En attente de position GPS'}
        </span>
        {updatedAt && lat && (
          <span className="text-xs text-gray-400">
            · Mis à jour{' '}
            {new Date(updatedAt).toLocaleTimeString('fr-MA', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        )}
      </div>

      <div
        className="rounded-xl overflow-hidden border border-gray-200"
        style={{ height: 260 }}
      >
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {!lat && (
        <p className="text-xs text-gray-400 italic text-center">
          La position sera visible dès que le collecteur démarre sa mission.
        </p>
      )}
    </div>
  )
}
