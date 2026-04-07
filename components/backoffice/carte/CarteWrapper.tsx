'use client'

import dynamic from 'next/dynamic'
import type { DemandeCarte, CollecteurCarte } from './CarteBO'

const CarteBO = dynamic(() => import('./CarteBO'), { ssr: false })

export default function CarteWrapper(props: {
  demandes: DemandeCarte[]
  collecteurs: CollecteurCarte[]
  centreId: string
}) {
  return <CarteBO {...props} />
}
