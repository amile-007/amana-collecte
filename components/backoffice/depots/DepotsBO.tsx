'use client'

import { useState, useTransition } from 'react'
import { validerDepot, signalerEcartDepot } from '@/lib/actions/backoffice'

export interface DepotPourBO {
  id: string
  collecteur_id: string
  collecteur_nom: string
  statut: 'en_attente' | 'valide' | 'rejete'
  montant_especes_attendu: number
  montant_especes_verse: number | null
  created_at: string
  nb_demandes: number
}

// ─── Récépissé imprimable ─────────────────────────────────────────────────────

function Recepisse({ depot, onClose }: { depot: DepotPourBO; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Zone imprimable */}
        <div id="recepisse-print" className="p-8">
          <div className="text-center mb-6">
            <p className="text-xs font-semibold text-[#CC0000] uppercase tracking-widest mb-1">AMANA Collecte</p>
            <h2 className="text-lg font-bold text-gray-900">Récépissé de dépôt</h2>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(depot.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-4 space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Collecteur</span>
              <span className="font-medium text-gray-900">{depot.collecteur_nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Demandes traitées</span>
              <span className="font-medium text-gray-900">{depot.nb_demandes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Montant attendu</span>
              <span className="font-medium text-gray-900">{depot.montant_especes_attendu.toFixed(2)} MAD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Montant versé</span>
              <span className="font-bold text-green-700">
                {(depot.montant_especes_verse ?? depot.montant_especes_attendu).toFixed(2)} MAD
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Dépôt #{depot.id.slice(0, 8).toUpperCase()}</span>
            <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Validé
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#CC0000] text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Imprimer
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card dépôt ───────────────────────────────────────────────────────────────

function DepotCard({
  depot,
  onValidated,
}: {
  depot: DepotPourBO
  onValidated: (updated: DepotPourBO) => void
}) {
  const [mode, setMode] = useState<'' | 'ecart'>('')
  const [montantSaisi, setMontantSaisi] = useState(String(depot.montant_especes_attendu))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [recepisseDepot, setRecepisseDepot] = useState<DepotPourBO | null>(null)

  const handleValider = () => {
    setError('')
    startTransition(async () => {
      const result = await validerDepot(depot.id)
      if (result.error) { setError(result.error); return }
      const updated = { ...depot, statut: 'valide' as const, montant_especes_verse: depot.montant_especes_attendu }
      setRecepisseDepot(updated)
      onValidated(updated)
    })
  }

  const handleEcart = () => {
    const montant = parseFloat(montantSaisi)
    if (isNaN(montant) || montant < 0) { setError('Montant invalide'); return }
    setError('')
    startTransition(async () => {
      const result = await signalerEcartDepot(depot.id, montant)
      if (result.error) { setError(result.error); return }
      const updated = { ...depot, statut: 'valide' as const, montant_especes_verse: montant }
      setRecepisseDepot(updated)
      onValidated(updated)
    })
  }

  const ecart = (depot.montant_especes_verse ?? 0) - depot.montant_especes_attendu

  return (
    <>
      {recepisseDepot && (
        <Recepisse depot={recepisseDepot} onClose={() => setRecepisseDepot(null)} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
              {depot.collecteur_nom.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{depot.collecteur_nom}</p>
              <p className="text-xs text-gray-400">
                {new Date(depot.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
            En attente
          </span>
        </div>

        {/* Corps */}
        <div className="px-5 py-4 grid grid-cols-3 gap-4 text-center border-b border-gray-100">
          <div>
            <p className="text-2xl font-bold text-gray-900">{depot.nb_demandes}</p>
            <p className="text-xs text-gray-400 mt-0.5">Demandes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{depot.montant_especes_attendu.toFixed(0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">MAD attendu</p>
          </div>
          {depot.montant_especes_verse != null ? (
            <div>
              <p className={`text-2xl font-bold ${ecart !== 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {depot.montant_especes_verse.toFixed(0)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">MAD versé</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-0.5">MAD versé</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4">
          {!mode ? (
            <div className="flex gap-3">
              <button
                onClick={handleValider}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#CC0000] text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Validation…' : 'Valider le dépôt'}
              </button>
              <button
                onClick={() => setMode('ecart')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Signaler un écart
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Montant réellement versé (MAD)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="Ex: 450.00"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setMode(''); setError('') }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Retour
                </button>
                <button
                  onClick={handleEcart}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Enregistrement…' : 'Confirmer avec écart'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function DepotsBO({ initial }: { initial: DepotPourBO[] }) {
  const [depots, setDepots] = useState(initial.filter((d) => d.statut === 'en_attente'))

  const handleValidated = (updated: DepotPourBO) => {
    setDepots((prev) => prev.filter((d) => d.id !== updated.id))
  }

  if (depots.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-sm font-medium text-gray-700">Aucun dépôt en attente</p>
        <p className="text-xs text-gray-400 mt-1">Tous les dépôts ont été traités</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {depots.map((d) => (
        <DepotCard key={d.id} depot={d} onValidated={handleValidated} />
      ))}
    </div>
  )
}
