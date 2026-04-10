'use client'

import { useState, useTransition } from 'react'
import { demarrerMission, confirmerCollecte, declarerAnomalie } from '@/lib/actions/collecteur'

const TYPES_ANOMALIE = [
  { value: 'absent', label: 'Client absent' },
  { value: 'adresse_incorrecte', label: 'Adresse incorrecte' },
  { value: 'colis_refuse', label: 'Colis refusé' },
  { value: 'acces_impossible', label: 'Accès impossible' },
  { value: 'autre', label: 'Autre' },
]

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  affectee:  { label: 'Affectée',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  en_cours:  { label: 'En cours',   bg: 'bg-amber-100',  text: 'text-amber-700' },
  collectee: { label: 'Collectée',  bg: 'bg-green-100',  text: 'text-green-700' },
  anomalie:  { label: 'Anomalie',   bg: 'bg-red-100',    text: 'text-red-700' },
}

interface Mission {
  id: string
  reference: string
  adresse_collecte_texte: string
  statut: string
  nb_colis: number
  notes: string | null
}

export default function MissionCard({ mission }: { mission: Mission }) {
  const [isPending, startTransition] = useTransition()
  const [showAnomalie, setShowAnomalie] = useState(false)
  const [typeAnomalie, setTypeAnomalie] = useState('absent')
  const [commentaire, setCommentaire] = useState('')
  const [error, setError] = useState('')

  const cfg = STATUT_CONFIG[mission.statut] ?? { label: mission.statut, bg: 'bg-gray-100', text: 'text-gray-700' }
  const isTerminal = ['collectee', 'anomalie', 'annulee'].includes(mission.statut)

  function run(action: () => Promise<{ error?: string }>) {
    setError('')
    startTransition(async () => {
      const res = await action()
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 ${isPending ? 'opacity-60' : ''}`}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-gray-400">{mission.reference}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">{mission.adresse_collecte_texte}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          {mission.nb_colis} colis
        </span>
        {mission.notes && (
          <span className="text-gray-400 truncate">{mission.notes}</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="flex flex-col gap-2">
          {mission.statut === 'affectee' && (
            <button
              onClick={() => run(() => demarrerMission(mission.id))}
              disabled={isPending}
              className="w-full bg-[#E30613] text-white text-sm font-semibold py-2.5 rounded-xl active:opacity-80 disabled:opacity-50"
            >
              Démarrer la mission
            </button>
          )}

          {mission.statut === 'en_cours' && (
            <>
              <button
                onClick={() => run(() => confirmerCollecte(mission.id))}
                disabled={isPending}
                className="w-full bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl active:opacity-80 disabled:opacity-50"
              >
                ✓ Confirmer la collecte
              </button>
              <button
                onClick={() => setShowAnomalie(!showAnomalie)}
                disabled={isPending}
                className="w-full bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl active:opacity-80 disabled:opacity-50"
              >
                Déclarer une anomalie
              </button>
            </>
          )}

          {/* Anomalie inline form */}
          {showAnomalie && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-red-700">Déclarer une anomalie</p>
              <select
                value={typeAnomalie}
                onChange={(e) => setTypeAnomalie(e.target.value)}
                className="text-sm border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {TYPES_ANOMALIE.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Commentaire (optionnel)"
                rows={2}
                className="text-sm border border-red-200 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    run(() => declarerAnomalie(mission.id, typeAnomalie, commentaire))
                    setShowAnomalie(false)
                  }}
                  disabled={isPending}
                  className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-50"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowAnomalie(false)}
                  className="flex-1 bg-white text-gray-600 text-sm font-medium py-2 rounded-xl border border-gray-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terminal state */}
      {isTerminal && (
        <div className={`text-center text-xs py-1.5 rounded-lg font-medium ${cfg.bg} ${cfg.text}`}>
          {mission.statut === 'collectee' ? '✓ Mission terminée' : '⚠ Anomalie déclarée'}
        </div>
      )}
    </div>
  )
}
