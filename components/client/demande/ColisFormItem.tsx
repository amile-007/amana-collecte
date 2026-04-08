'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { VILLES_DEMO, calculerPoidsVolumetrique, calculerPoidsReference, calculerTarif } from '@/lib/utils/tarification'
import type { VilleDemo } from '@/lib/utils/tarification'

const MapPickerMini = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />,
})

export interface ColisItemData {
  _id: string
  destination_ville: VilleDemo
  destinataire_nom: string
  destinataire_telephone: string
  destinataire_adresse: string
  destinataire_lat: number | null
  destinataire_lng: number | null
  poids_declare: string
  longueur: string
  largeur: string
  hauteur: string
  crbt_montant: string
}

export function defaultColis(): ColisItemData {
  return {
    _id: crypto.randomUUID(),
    destination_ville: 'Casablanca',
    destinataire_nom: '',
    destinataire_telephone: '',
    destinataire_adresse: '',
    destinataire_lat: null,
    destinataire_lng: null,
    poids_declare: '',
    longueur: '',
    largeur: '',
    hauteur: '',
    crbt_montant: '',
  }
}

interface ColisFormItemProps {
  index: number
  data: ColisItemData
  villeCollecte: VilleDemo
  canDelete: boolean
  onChange: (d: ColisItemData) => void
  onDelete: () => void
}

export default function ColisFormItem({
  index, data, villeCollecte, canDelete, onChange, onDelete,
}: ColisFormItemProps) {
  const [showMap, setShowMap] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  const set = (key: keyof ColisItemData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...data, [key]: e.target.value })

  // Calculs en temps réel
  const p = parseFloat(data.poids_declare) || 0
  const l = parseFloat(data.longueur) || 0
  const larg = parseFloat(data.largeur) || 0
  const h = parseFloat(data.hauteur) || 0
  const poidsVol = l && larg && h ? calculerPoidsVolumetrique(l, larg, h) : 0
  const poidsRef = p || poidsVol ? calculerPoidsReference(p, poidsVol) : 0
  const tarif = poidsRef ? calculerTarif(villeCollecte, data.destination_ville, poidsRef) : 0

  // Détection intra/inter-ville
  const isIntraVille = villeCollecte === data.destination_ville

  // Reverse geocoding sur clic carte
  const handleMapPick = async (lat: number, lng: number) => {
    onChange({ ...data, destinataire_lat: lat, destinataire_lng: lng })
    setGeoLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const json = await res.json()
      const adresse = json.display_name ?? ''
      onChange({ ...data, destinataire_lat: lat, destinataire_lng: lng, destinataire_adresse: adresse })
    } catch {
      onChange({ ...data, destinataire_lat: lat, destinataire_lng: lng })
    } finally {
      setGeoLoading(false)
    }
  }

  const labelCls = 'text-xs font-medium text-gray-600'
  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      {/* En-tête colis */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-[#CC0000] text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-gray-900">Colis {index + 1}</span>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Supprimer
          </button>
        )}
      </div>

      {/* Destination + badge variante */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Ville de destination *</label>
        <div className="flex gap-2">
          {VILLES_DEMO.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...data, destination_ville: v })}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                data.destination_ville === v
                  ? 'border-[#CC0000] bg-red-50 text-[#CC0000]'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {/* Badge intra/inter-ville */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mt-0.5 ${
          isIntraVille
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isIntraVille ? 'bg-green-500' : 'bg-blue-500'}`} />
          {isIntraVille
            ? 'Intra-ville — livraison directe par le collecteur'
            : 'Inter-ville — injection réseau BARID AL MAGHRIB'}
        </div>
      </div>

      {/* Destinataire */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Nom destinataire *</label>
          <input className={inputCls} placeholder="Ex. : Karim Alaoui" value={data.destinataire_nom} onChange={set('destinataire_nom')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Téléphone *</label>
          <input className={inputCls} placeholder="+212 6 00 00 00 00" value={data.destinataire_telephone} onChange={set('destinataire_telephone')} type="tel" />
        </div>
      </div>

      {/* Adresse livraison + mini carte */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Adresse de livraison *</label>
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="text-xs text-[#CC0000] hover:underline flex items-center gap-1"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showMap ? 'Masquer la carte' : 'Choisir sur la carte'}
          </button>
        </div>
        <div className="relative">
          <input
            className={inputCls}
            placeholder="Ex. : 5 Bd Zerktouni, Casablanca"
            value={data.destinataire_adresse}
            onChange={set('destinataire_adresse')}
          />
          {geoLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 animate-pulse">
              Géoloc…
            </span>
          )}
        </div>
        {data.destinataire_lat && data.destinataire_lng && (
          <p className="text-[10px] text-green-600 font-mono">
            ✓ Position GPS : {data.destinataire_lat.toFixed(5)}, {data.destinataire_lng.toFixed(5)}
          </p>
        )}
        {showMap && (
          <MapPickerMini
            lat={data.destinataire_lat}
            lng={data.destinataire_lng}
            onPick={handleMapPick}
            height={200}
          />
        )}
      </div>

      {/* Dimensions + poids */}
      <div>
        <p className={`${labelCls} mb-2`}>Dimensions et poids *</p>
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 text-center">Poids (kg)</span>
            <input className={`${inputCls} text-center`} type="number" min="0.1" step="0.1" placeholder="0.0" value={data.poids_declare} onChange={set('poids_declare')} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 text-center">Long. (cm)</span>
            <input className={`${inputCls} text-center`} type="number" min="1" placeholder="0" value={data.longueur} onChange={set('longueur')} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 text-center">Larg. (cm)</span>
            <input className={`${inputCls} text-center`} type="number" min="1" placeholder="0" value={data.largeur} onChange={set('largeur')} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 text-center">Haut. (cm)</span>
            <input className={`${inputCls} text-center`} type="number" min="1" placeholder="0" value={data.hauteur} onChange={set('hauteur')} />
          </div>
        </div>
      </div>

      {/* Calcul volumétrique en temps réel */}
      {(p > 0 || (l > 0 && larg > 0 && h > 0)) && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex gap-4 text-gray-600">
            <span>Vol. : <strong>{poidsVol.toFixed(3)} kg</strong></span>
            <span>Réf. : <strong className="text-gray-900">{poidsRef.toFixed(3)} kg</strong></span>
          </div>
          <div className="text-right">
            <span className="text-gray-500">Tarif estimé</span>
            <p className="text-base font-bold text-[#CC0000]">{tarif} MAD</p>
          </div>
        </div>
      )}

      {/* CRBT */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>
          Montant CRBT <span className="font-normal text-gray-400">(optionnel — à encaisser à la livraison)</span>
        </label>
        <div className="relative">
          <input
            className={`${inputCls} pr-12`}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={data.crbt_montant}
            onChange={set('crbt_montant')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">MAD</span>
        </div>
      </div>
    </div>
  )
}
