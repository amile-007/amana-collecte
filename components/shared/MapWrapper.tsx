'use client'

// Wrapper Leaflet générique — remplace CarteWrapper et CarteCollecteurWrapper
// Usage :
//   import MapWrapper from '@/components/shared/MapWrapper'
//   <MapWrapper markers={markers} center={[33.5731, -7.5898]} zoom={12} height="400px" />

import dynamic from 'next/dynamic'

export interface MapMarker {
  id:       string
  lat:      number
  lng:      number
  color?:   string      // hex, défaut #E30613
  label?:   string      // popup title
  subLabel?: string     // popup subtitle
}

export interface MapWrapperProps {
  markers:  MapMarker[]
  center?:  [number, number]
  zoom?:    number
  height?:  string
  className?: string
}

const MapInner = dynamic(() => import('./MapInner'), { ssr: false })

export default function MapWrapper(props: MapWrapperProps) {
  return <MapInner {...props} />
}
