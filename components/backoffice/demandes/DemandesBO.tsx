'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { affecterDemande } from '@/lib/actions/backoffice'
import type { StatutDemande, CollecteurAvecProfil } from '@/lib/types'

// ─── Types locaux ─────────────────────────────────────────────────────────────

export interface DemandePourBO {
  id: string
  reference: string
  statut: StatutDemande
  type_variante: 'inter_ville' | 'intra_ville'
  adresse_collecte_texte: string
  montant_total: number | null
  created_at: string
  client_nom: string
  collecteur_nom: string | null
  collecteur_id: string | null
  nb_colis: number
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; classes: string }> = {
  en_attente:     { label: 'En attente',       classes: 'bg-yellow-100 text-yellow-700' },
  affectee:       { label: 'Affectée',          classes: 'bg-blue-100 text-blue-700' },
  en_cours:       { label: 'En cours',          classes: 'bg-purple-100 text-purple-700' },
  collectee:      { label: 'Collectée',         classes: 'bg-green-100 text-green-700' },
  en_transit:     { label: 'En transit',        classes: 'bg-teal-100 text-teal-700' },
  livree:         { label: 'Livrée',            classes: 'bg-emerald-100 text-emerald-700' },
  deposee_centre: { label: 'Déposée centre',    classes: 'bg-sky-100 text-sky-700' },
  en_instance:    { label: 'En instance',       classes: 'bg-orange-100 text-orange-700' },
  retournee:      { label: 'Retournée',         classes: 'bg-gray-100 text-gray-600' },
  anomalie:       { label: 'Anomalie',          classes: 'bg-red-100 text-red-700' },
  annulee:        { label: 'Annulée',           classes: 'bg-gray-100 text-gray-400' },
}

function StatutBadge({ statut }: { statut: string }) {
  const cfg = STATUT_CONFIG[statut] ?? { label: statut, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

// ─── Modal affectation ─────────────────────────────────────────────────────────

function AffectationModal({
  demande,
  collecteurs,
  onClose,
  onSuccess,
}: {
  demande: DemandePourBO
  collecteurs: CollecteurAvecProfil[]
  onClose: () => void
  onSuccess: (collecteur: CollecteurAvecProfil) => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!selected) return
    setError('')
    startTransition(async () => {
      const result = await affecterDemande(demande.id, selected)
      if (result.error) {
        setError(result.error)
      } else {
        const collecteur = collecteurs.find((c) => c.id === selected)!
        onSuccess(collecteur)
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {demande.statut === 'affectee' ? 'Réaffecter' : 'Affecter'} la demande
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{demande.reference}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Collecteurs list */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          {collecteurs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucun collecteur disponible</p>
          ) : (
            <div className="flex flex-col gap-2">
              {collecteurs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                    selected === c.id
                      ? 'border-[#CC0000] bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    selected === c.id ? 'bg-[#CC0000] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.prenom?.[0]}{c.nom?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-gray-400 truncate">{c.zone_intervention ?? 'Zone non définie'}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">
                    Disponible
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected || isPending || collecteurs.length === 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#CC0000] text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Affectation…' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────

const STATUTS_FILTRE = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'affectee', label: 'Affectée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'collectee', label: 'Collectée' },
  { value: 'livree', label: 'Livrée' },
  { value: 'deposee_centre', label: 'Déposée centre' },
  { value: 'anomalie', label: 'Anomalie' },
  { value: 'annulee', label: 'Annulée' },
]

function filterByDate(demandes: DemandePourBO[], periode: string): DemandePourBO[] {
  if (!periode || periode === 'all') return demandes
  const now = new Date()
  const cutoff = new Date()
  if (periode === 'today') { cutoff.setHours(0, 0, 0, 0) }
  else if (periode === 'week') { cutoff.setDate(now.getDate() - 7) }
  else if (periode === 'month') { cutoff.setDate(now.getDate() - 30) }
  return demandes.filter((d) => new Date(d.created_at) >= cutoff)
}

export default function DemandesBO({
  demandes: initial,
  collecteurs,
}: {
  demandes: DemandePourBO[]
  collecteurs: CollecteurAvecProfil[]
}) {
  const router = useRouter()
  const [demandes, setDemandes] = useState(initial)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreDate, setFiltreDate] = useState('all')
  const [filtreCollecteur, setFiltreCollecteur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [modal, setModal] = useState<DemandePourBO | null>(null)

  const filtered = useMemo(() => {
    let list = filterByDate(demandes, filtreDate)
    if (filtreStatut) list = list.filter((d) => d.statut === filtreStatut)
    if (filtreCollecteur) list = list.filter((d) => d.collecteur_id === filtreCollecteur)
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase()
      list = list.filter(
        (d) =>
          d.reference.toLowerCase().includes(q) ||
          d.client_nom.toLowerCase().includes(q) ||
          d.adresse_collecte_texte.toLowerCase().includes(q)
      )
    }
    return list
  }, [demandes, filtreStatut, filtreDate, filtreCollecteur, recherche])

  const handleSuccess = (demande: DemandePourBO, collecteur: CollecteurAvecProfil) => {
    setDemandes((prev) =>
      prev.map((d) =>
        d.id === demande.id
          ? { ...d, statut: 'affectee', collecteur_id: collecteur.id, collecteur_nom: `${collecteur.prenom} ${collecteur.nom}` }
          : d
      )
    )
    router.refresh()
  }

  const collecteursFiltres = collecteurs.filter((c) => c.statut === 'disponible')

  // Collecteurs uniques pour le filtre (tous, pas juste disponibles)
  const collecteursUniques = Array.from(
    new Map(
      demandes
        .filter((d) => d.collecteur_id && d.collecteur_nom)
        .map((d) => [d.collecteur_id!, { id: d.collecteur_id!, nom: d.collecteur_nom! }])
    ).values()
  )

  return (
    <>
      {modal && (
        <AffectationModal
          demande={modal}
          collecteurs={collecteursFiltres}
          onClose={() => setModal(null)}
          onSuccess={(c) => handleSuccess(modal, c)}
        />
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Référence, client, adresse…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          {STATUTS_FILTRE.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filtreDate}
          onChange={(e) => setFiltreDate(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          <option value="all">Toutes les dates</option>
          <option value="today">Aujourd&apos;hui</option>
          <option value="week">7 derniers jours</option>
          <option value="month">30 derniers jours</option>
        </select>
        {collecteursUniques.length > 0 && (
          <select
            value={filtreCollecteur}
            onChange={(e) => setFiltreCollecteur(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            <option value="">Tous les collecteurs</option>
            {collecteursUniques.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Référence</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Adresse collecte</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Colis</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">Collecteur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-gray-900">{d.reference}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{d.type_variante === 'intra_ville' ? 'Intra-ville' : 'Inter-ville'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.client_nom}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-gray-600 text-xs max-w-48 truncate">{d.adresse_collecte_texte}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                        {d.nb_colis}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={d.statut} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-gray-600 text-xs">{d.collecteur_nom ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-gray-400 text-xs">
                        {new Date(d.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(d.statut === 'en_attente' || d.statut === 'affectee') && (
                        <button
                          onClick={() => setModal(d)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            d.statut === 'affectee'
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-[#CC0000] text-white hover:bg-red-700'
                          }`}
                        >
                          {d.statut === 'affectee' ? 'Réaffecter' : 'Affecter'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">{filtered.length} demande{filtered.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </>
  )
}
