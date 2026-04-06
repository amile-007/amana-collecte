'use client'

import dynamic from 'next/dynamic'

const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then((m) => m.CircleMarker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
)

import 'leaflet/dist/leaflet.css'

interface SuiviGPSProps {
  lat: number | null
  lng: number | null
  collecteurNom?: string
  updatedAt?: string | null
}

export default function SuiviGPS({ lat, lng, collecteurNom, updatedAt }: SuiviGPSProps) {
  const center: [number, number] = lat && lng ? [lat, lng] : [33.5731, -7.5898]

  return (
    <div className="flex flex-col gap-2">
      {/* Indicateur live */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${lat ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        <span className="text-xs font-medium text-gray-600">
          {lat ? 'Suivi GPS en direct' : 'En attente de position GPS'}
        </span>
        {updatedAt && lat && (
          <span className="text-xs text-gray-400">
            · Mis à jour {new Date(updatedAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 260 }}>
        <MapContainer center={center} zoom={lat ? 15 : 12} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {lat && lng && (
            <CircleMarker center={[lat, lng]} radius={12} color="#CC0000" fillColor="#CC0000" fillOpacity={0.9} weight={3}>
              <Popup>{collecteurNom ?? 'Collecteur'}</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {!lat && (
        <p className="text-xs text-gray-400 italic text-center">
          La position sera visible dès que le collecteur démarre sa mission.
        </p>
      )}
    </div>
  )
}
