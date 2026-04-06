'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'affectee', label: 'Affectée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'collectee', label: 'Collectée' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annulee', label: 'Annulée' },
]

const PERIODES = [
  { value: '', label: 'Toutes dates' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
]

export default function FiltresDemandes() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, sp])

  return (
    <div className="flex flex-wrap gap-3">
      {/* Recherche référence */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Référence AMD-…"
          defaultValue={sp.get('ref') ?? ''}
          onChange={(e) => setParam('ref', e.target.value)}
          className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent w-44"
        />
      </div>

      {/* Filtre statut */}
      <select
        value={sp.get('statut') ?? ''}
        onChange={(e) => setParam('statut', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#CC0000] bg-white"
      >
        {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Filtre période */}
      <select
        value={sp.get('periode') ?? ''}
        onChange={(e) => setParam('periode', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#CC0000] bg-white"
      >
        {PERIODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      {/* Reset */}
      {(sp.get('statut') || sp.get('periode') || sp.get('ref')) && (
        <button
          onClick={() => router.replace(pathname)}
          className="text-xs text-gray-500 hover:text-[#CC0000] underline"
        >
          Réinitialiser
        </button>
      )}
    </div>
  )
}
