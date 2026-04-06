'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import type { VilleDemo } from '@/lib/utils/tarification'
import { VILLES_DEMO } from '@/lib/utils/tarification'
import Button from '@/components/ui/Button'

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-200 bg-gray-100 animate-pulse" style={{ height: 320 }} />
  ),
})

export interface Step1Data {
  villeCollecte: VilleDemo
  adresseTexte: string
  lat: number | null
  lng: number | null
}

interface Step1Props {
  data: Step1Data
  onChange: (d: Step1Data) => void
  onNext: () => void
}

export default function Step1Adresse({ data, onChange, onNext }: Step1Props) {
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  const handleMapPick = useCallback(
    async (lat: number, lng: number) => {
      onChange({ ...data, lat, lng })
      // Reverse geocoding Nominatim pour remplir le champ texte
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
          { headers: { 'Accept-Language': 'fr' } }
        )
        const json = await res.json()
        const adresse = json.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        onChange({ ...data, lat, lng, adresseTexte: adresse })
      } catch {
        onChange({ ...data, lat, lng })
      }
    },
    [data, onChange]
  )

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par ce navigateur.')
      return
    }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        handleMapPick(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setGeoLoading(false)
        setGeoError('Impossible de récupérer votre position.')
      }
    )
  }

  const canProceed = data.adresseTexte.trim().length > 5 && data.lat !== null

  return (
    <div className="flex flex-col gap-6">
      {/* Ville de collecte */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Ville de collecte <span className="text-[#CC0000]">*</span>
        </label>
        <div className="flex gap-3">
          {VILLES_DEMO.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...data, villeCollecte: v })}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                data.villeCollecte === v
                  ? 'border-[#CC0000] bg-red-50 text-[#CC0000]'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Carte */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Adresse de collecte <span className="text-[#CC0000]">*</span>
          </label>
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="flex items-center gap-1.5 text-xs text-[#CC0000] hover:underline disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {geoLoading ? 'Localisation...' : 'Ma position'}
          </button>
        </div>

        <MapPicker lat={data.lat} lng={data.lng} onPick={handleMapPick} />

        {geoError && <p className="text-xs text-red-600">{geoError}</p>}
      </div>

      {/* Champ texte adresse */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Adresse complète</label>
        <textarea
          value={data.adresseTexte}
          onChange={(e) => onChange({ ...data, adresseTexte: e.target.value })}
          rows={2}
          placeholder="Ex. : 12 Rue Mohammed V, Maarif, Casablanca"
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent resize-none"
        />
        {data.lat && (
          <p className="text-xs text-gray-400">
            Coordonnées : {data.lat.toFixed(5)}°N, {data.lng!.toFixed(5)}°E
          </p>
        )}
      </div>

      <Button onClick={onNext} fullWidth disabled={!canProceed}>
        Continuer — Composition des colis →
      </Button>
    </div>
  )
}
