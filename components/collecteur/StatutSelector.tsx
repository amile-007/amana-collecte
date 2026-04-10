'use client'

import { useState, useTransition } from 'react'
import { updateStatutCollecteur } from '@/lib/actions/collecteur'

const OPTIONS = [
  { value: 'disponible',   label: 'Disponible',    dot: 'bg-green-500' },
  { value: 'en_mission',   label: 'En mission',    dot: 'bg-amber-500' },
  { value: 'indisponible', label: 'Indisponible',  dot: 'bg-gray-400'  },
] as const

type Statut = 'disponible' | 'en_mission' | 'indisponible'

export default function StatutSelector({ current }: { current: Statut }) {
  const [statut, setStatut] = useState<Statut>(current)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function onChange(s: Statut) {
    setError('')
    setStatut(s)
    startTransition(async () => {
      const res = await updateStatutCollecteur(s)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mon statut</p>
      <div className={`flex flex-col gap-2 ${isPending ? 'opacity-60' : ''}`}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={isPending}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
              statut === opt.value
                ? 'border-[#E30613] bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
            <span className={`text-sm font-medium ${statut === opt.value ? 'text-[#E30613]' : 'text-gray-700'}`}>
              {opt.label}
            </span>
            {statut === opt.value && (
              <svg className="ml-auto w-4 h-4 text-[#E30613]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
