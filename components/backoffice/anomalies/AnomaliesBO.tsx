'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { resoudreAnomalie } from '@/lib/actions/backoffice'
import type { CollecteurAvecProfil } from '@/lib/types'

export interface AnomaliePourBO {
  id: string
  demande_id: string
  collecteur_id: string
  type_anomalie: string
  commentaire: string | null
  photo_urls: string[] | null
  statut_traitement: 'ouverte' | 'en_cours' | 'resolue'
  created_at: string
  demande_reference: string
  demande_adresse: string
  collecteur_nom: string
}

function AnomalieCard({
  anomalie,
  collecteurs,
  onResolve,
}: {
  anomalie: AnomaliePourBO
  collecteurs: CollecteurAvecProfil[]
  onResolve: (id: string) => void
}) {
  const [action, setAction] = useState<'' | 'reaffecter' | 'annuler'>('')
  const [nouveauCollecteur, setNouveauCollecteur] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const handleConfirm = () => {
    if (!action) return
    if (action === 'reaffecter' && !nouveauCollecteur) return
    setError('')
    startTransition(async () => {
      const result = await resoudreAnomalie(
        anomalie.id,
        action,
        action === 'reaffecter' ? nouveauCollecteur : undefined
      )
      if (result.error) {
        setError(result.error)
      } else {
        onResolve(anomalie.id)
      }
    })
  }

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh]">
            <Image
              src={lightboxUrl}
              alt="Photo anomalie"
              width={800}
              height={600}
              className="rounded-xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <p className="text-sm font-semibold text-gray-900">{anomalie.type_anomalie}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Demande <span className="font-mono font-semibold">{anomalie.demande_reference}</span>
              {' · '}{anomalie.demande_adresse}
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium shrink-0">
            Ouverte
          </span>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Infos */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Collecteur : </span>
              <span className="font-medium">{anomalie.collecteur_nom}</span>
            </div>
            <div>
              <span className="text-gray-400">Déclarée le : </span>
              <span className="font-medium">
                {new Date(anomalie.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Commentaire */}
          {anomalie.commentaire && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              {anomalie.commentaire}
            </p>
          )}

          {/* Photos */}
          {anomalie.photo_urls && anomalie.photo_urls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {anomalie.photo_urls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxUrl(url)}
                  className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                >
                  <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-100 pt-4">
            {!action ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setAction('reaffecter')}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Réaffecter la mission
                </button>
                <button
                  onClick={() => setAction('annuler')}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-[#CC0000] hover:bg-red-100 transition-colors"
                >
                  Annuler la demande
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {action === 'annuler' && (
                  <p className="text-sm text-gray-700">
                    Confirmer l&apos;annulation de la demande <strong>{anomalie.demande_reference}</strong> ?
                  </p>
                )}
                {action === 'reaffecter' && (
                  <select
                    value={nouveauCollecteur}
                    onChange={(e) => setNouveauCollecteur(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <option value="">Sélectionner un collecteur disponible</option>
                    {collecteurs.filter((c) => c.statut === 'disponible' && c.id !== anomalie.collecteur_id).map((c) => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.zone_intervention ?? 'Zone non définie'}</option>
                    ))}
                  </select>
                )}
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setAction(''); setError(''); setNouveauCollecteur('') }}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isPending || (action === 'reaffecter' && !nouveauCollecteur)}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors ${
                      action === 'annuler' ? 'bg-[#CC0000] hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isPending ? 'Traitement…' : action === 'annuler' ? 'Confirmer annulation' : 'Confirmer réaffectation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function AnomaliesBO({
  initial,
  collecteurs,
  centreId,
}: {
  initial: AnomaliePourBO[]
  collecteurs: CollecteurAvecProfil[]
  centreId: string
}) {
  const [anomalies, setAnomalies] = useState(initial)

  const handleResolve = (id: string) => {
    setAnomalies((prev) => prev.filter((a) => a.id !== id))
  }

  // Realtime : nouvelles anomalies
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`anomalies:${centreId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'anomalies' },
        async (payload) => {
          const a = payload.new
          // Enrichir avec demande + collecteur
          const [{ data: demande }, { data: collecteur }] = await Promise.all([
            supabase.from('demandes').select('reference, adresse_collecte_texte').eq('id', a.demande_id).single(),
            supabase.from('profiles').select('nom, prenom').eq('id', a.collecteur_id).single(),
          ])
          const enriched: AnomaliePourBO = {
            ...a,
            demande_reference: demande?.reference ?? '',
            demande_adresse: demande?.adresse_collecte_texte ?? '',
            collecteur_nom: collecteur ? `${collecteur.prenom} ${collecteur.nom}` : '',
          }
          setAnomalies((prev) => [enriched, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'anomalies' },
        (payload) => {
          if (payload.new.statut_traitement === 'resolue') {
            setAnomalies((prev) => prev.filter((a) => a.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [centreId])

  if (anomalies.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-sm font-medium text-gray-700">Aucune anomalie ouverte</p>
        <p className="text-xs text-gray-400 mt-1">Toutes les anomalies sont résolues</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {anomalies.map((a) => (
        <AnomalieCard
          key={a.id}
          anomalie={a}
          collecteurs={collecteurs}
          onResolve={handleResolve}
        />
      ))}
    </div>
  )
}
