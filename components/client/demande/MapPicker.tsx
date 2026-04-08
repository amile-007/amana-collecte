'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix icône Leaflet (les assets sont servis depuis le CDN pour éviter les problèmes Webpack/Turbopack)
const MARKER_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// Marqueur rouge AMANA
const MARKER_AMANA = L.divIcon({
  html: `<div style="
    width:28px;height:28px;
    background:#CC0000;border:3px solid white;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
})

interface MapClickHandlerProps {
  onPick: (lat: number, lng: number) => void
}

function MapClickHandler({ onPick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface MapPickerProps {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
  height?: number
}

const CASABLANCA: [number, number] = [33.5731, -7.5898]

export default function MapPicker({ lat, lng, onPick, height = 320 }: MapPickerProps) {
  const position: [number, number] = lat && lng ? [lat, lng] : CASABLANCA

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height }}>
      <MapContainer
        center={CASABLANCA}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPick={onPick} />
        {lat && lng && (
          <Marker position={[lat, lng]} icon={MARKER_AMANA} />
        )}
      </MapContainer>

      {/* Légende */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-600 shadow">
        Cliquez sur la carte pour placer l&apos;adresse
      </div>
    </div>
  )
}
