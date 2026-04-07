'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CollecteurAvecProfil } from '@/lib/types'

export interface DemandeCarte {
  id: string
  reference: string
  statut: string
  adresse_collecte_texte: string
  adresse_collecte_lat: number
  adresse_collecte_lng: number
}

export interface CollecteurCarte extends Pick<CollecteurAvecProfil, 'id' | 'nom' | 'prenom' | 'statut' | 'position_lat' | 'position_lng' | 'position_updated_at'> {}

export default function CarteBO({
  demandes: initialDemandes,
  collecteurs: initialCollecteurs,
  centreId,
}: {
  demandes: DemandeCarte[]
  collecteurs: CollecteurCarte[]
  centreId: string
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null)
  const markersRef = useRef<{ demandes: unknown[]; collecteurs: Map<string, unknown> }>({
    demandes: [],
    collecteurs: new Map(),
  })

  const [demandes, setDemandes] = useState(initialDemandes)
  const [collecteurs, setCollecteurs] = useState(initialCollecteurs)
  const [info, setInfo] = useState<string | null>(null)

  // Initialiser la carte
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    let L: typeof import('leaflet')

    import('leaflet').then((module) => {
      L = module.default

      const map = L.map(mapRef.current!, {
        center: [33.5731, -7.5898],
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      leafletRef.current = map

      // Marqueurs demandes (rouges)
      demandes.forEach((d) => {
        const icon = L.divIcon({
          html: `<div style="background:#CC0000;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        const marker = L.marker([d.adresse_collecte_lat, d.adresse_collecte_lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${d.reference}</strong><br/>${d.adresse_collecte_texte}<br/><span style="font-size:11px;color:#666">${d.statut}</span>`)
        markersRef.current.demandes.push(marker)
      })

      // Marqueurs collecteurs (verts)
      collecteurs.forEach((c) => {
        if (!c.position_lat || !c.position_lng) return
        const icon = L.divIcon({
          html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="font-size:8px;color:white;font-weight:bold">${c.prenom?.[0] ?? '?'}</span></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        const marker = L.marker([c.position_lat, c.position_lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${c.prenom} ${c.nom}</strong><br/><span style="font-size:11px;color:#16a34a">● Disponible</span>`)
        markersRef.current.collecteurs.set(c.id, marker)
      })
    })

    return () => {
      leafletRef.current?.remove()
      leafletRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime : positions collecteurs
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`carte:${centreId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'collecteurs' },
        (payload) => {
          const c = payload.new as CollecteurCarte
          setCollecteurs((prev) =>
            prev.map((col) => (col.id === c.id ? { ...col, ...c } : col))
          )
          setInfo(`Position mise à jour : ${c.id.slice(0, 8)}…`)
          setTimeout(() => setInfo(null), 3000)

          // Mettre à jour le marqueur Leaflet
          import('leaflet').then((module) => {
            const L = module.default
            if (!c.position_lat || !c.position_lng || !leafletRef.current) return
            const existing = markersRef.current.collecteurs.get(c.id) as ReturnType<typeof L.marker> | undefined
            if (existing) {
              existing.setLatLng([c.position_lat, c.position_lng])
            }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'demandes' },
        (payload) => {
          const d = payload.new as DemandeCarte
          if (d.adresse_collecte_lat && d.adresse_collecte_lng) {
            setDemandes((prev) => [...prev, d])
            import('leaflet').then((module) => {
              const L = module.default
              if (!leafletRef.current) return
              const icon = L.divIcon({
                html: `<div style="background:#CC0000;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
                className: '',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })
              L.marker([d.adresse_collecte_lat, d.adresse_collecte_lng], { icon })
                .addTo(leafletRef.current!)
                .bindPopup(`<strong>${d.reference}</strong><br/>${d.adresse_collecte_texte}`)
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [centreId])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200">
      {/* Légende */}
      <div className="absolute top-3 left-3 z-[1000] bg-white rounded-xl shadow-md px-3 py-2 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#CC0000] border border-white shadow-sm" />
          <span className="text-gray-600">Demande ({demandes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600 border border-white shadow-sm" />
          <span className="text-gray-600">Collecteur ({collecteurs.filter(c => c.position_lat).length})</span>
        </div>
      </div>

      {/* Info toast */}
      {info && (
        <div className="absolute top-3 right-3 z-[1000] bg-green-600 text-white text-xs px-3 py-2 rounded-lg shadow-md">
          {info}
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
