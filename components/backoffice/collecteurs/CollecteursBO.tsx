'use client'

import { useState, useTransition } from 'react'
import { toggleCollecteurActif } from '@/lib/actions/backoffice'

export interface CollecteurPourBO {
  id: string
  nom: string
  prenom: string
  telephone: string
  statut: 'disponible' | 'en_mission' | 'indisponible'
  actif: boolean
  zone_intervention: string | null
  position_lat: number | null
  position_lng: number | null
  position_updated_at: string | null
  missions_aujourd_hui: number
}

const STATUT_CONFIG = {
  disponible:    { label: 'Disponible',    bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  en_mission:    { label: 'En mission',    bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  indisponible:  { label: 'Indisponible',  bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
}

function formatGPS(lat: number | null, lng: number | null, updatedAt: string | null) {
  if (!lat || !lng) return { label: 'Aucune position', sub: null }
  const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  if (!updatedAt) return { label, sub: null }
  const d = new Date(updatedAt)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  const sub = diffMin < 1 ? "À l'instant" : diffMin < 60 ? `Il y a ${diffMin} min` : `Il y a ${Math.floor(diffMin / 60)}h`
  return { label, sub }
}

function CollecteurRow({
  c,
  onToggle,
}: {
  c: CollecteurPourBO
  onToggle: (id: string, actif: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const cfg = STATUT_CONFIG[c.statut]
  const gps = formatGPS(c.position_lat, c.position_lng, c.position_updated_at)

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleCollecteurActif(c.id, !c.actif)
      if (!result.error) onToggle(c.id, !c.actif)
    })
  }

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${!c.actif ? 'opacity-50' : ''}`}>
      {/* Identité */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
            {c.prenom?.[0]}{c.nom?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{c.prenom} {c.nom}</p>
            <p className="text-xs text-gray-400">{c.telephone || '—'}</p>
          </div>
        </div>
      </td>

      {/* Zone */}
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-xs text-gray-600">{c.zone_intervention ?? '—'}</p>
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </td>

      {/* Missions aujourd'hui */}
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
          c.missions_aujourd_hui > 0 ? 'bg-[#CC0000] text-white' : 'bg-gray-100 text-gray-400'
        }`}>
          {c.missions_aujourd_hui}
        </span>
      </td>

      {/* Position GPS */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <p className="text-xs text-gray-600 font-mono">{gps.label}</p>
        {gps.sub && <p className="text-[10px] text-gray-400">{gps.sub}</p>}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            c.actif
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {isPending ? '…' : c.actif ? 'Désactiver' : 'Activer'}
        </button>
      </td>
    </tr>
  )
}

export default function CollecteursBO({ initial }: { initial: CollecteurPourBO[] }) {
  const [collecteurs, setCollecteurs] = useState(initial)

  const handleToggle = (id: string, actif: boolean) => {
    setCollecteurs((prev) => prev.map((c) => (c.id === id ? { ...c, actif } : c)))
  }

  const disponibles = collecteurs.filter((c) => c.statut === 'disponible' && c.actif).length
  const enMission  = collecteurs.filter((c) => c.statut === 'en_mission').length
  const totalMissions = collecteurs.reduce((s, c) => s + c.missions_aujourd_hui, 0)

  return (
    <div className="space-y-5">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Disponibles', value: disponibles, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'En mission',  value: enMission,  color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200' },
          { label: "Missions aujourd'hui", value: totalMissions, color: 'text-[#CC0000]', bg: 'bg-red-50 border-red-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {collecteurs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Aucun collecteur dans ce centre</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Collecteur</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Zone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Missions</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Dernière position</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {collecteurs.map((c) => (
                  <CollecteurRow key={c.id} c={c} onToggle={handleToggle} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">{collecteurs.length} collecteur{collecteurs.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
