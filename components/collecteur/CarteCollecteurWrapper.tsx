'use client'

import dynamic from 'next/dynamic'

interface MissionPoint {
  id: string
  reference: string
  adresse: string
  statut: string
  lat: number
  lng: number
}

const CarteCollecteur = dynamic(() => import('./CarteCollecteur'), { ssr: false })

export default function CarteCollecteurWrapper({ missions }: { missions: MissionPoint[] }) {
  return <CarteCollecteur missions={missions} />
}
