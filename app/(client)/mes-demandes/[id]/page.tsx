import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatutBadge from '@/components/client/demandes/StatutBadge'
import TimelineStatuts from '@/components/client/demandes/TimelineStatuts'
import ColisQRCard from '@/components/client/demandes/ColisQRCard'
import SuiviGPS from '@/components/client/demandes/SuiviGPS'
import AnnulerDemandeButton from '@/components/client/demandes/AnnulerDemandeButton'
import PreuveLivraison from '@/components/shared/PreuveLivraison'
import type { StatutDemande, Colis, StatutHistorique } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DetailDemandePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Demande (ownership check intégré)
  const { data: demande } = await supabase
    .from('demandes')
    .select('*')
    .eq('id', id)
    .eq('client_id', user!.id)
    .single()

  if (!demande) notFound()

  // Colis
  const { data: colisList } = await supabase
    .from('colis')
    .select('*')
    .eq('demande_id', id)
    .order('created_at')

  // Historique statuts
  const { data: historique } = await supabase
    .from('statuts_historique')
    .select('*')
    .eq('demande_id', id)
    .order('created_at', { ascending: false })

  // Position GPS collecteur (intra-ville collectée)
  let collecteurPosition = null
  if (demande.collecteur_id && demande.type_variante === 'intra_ville' && demande.statut === 'collectee') {
    const { data: col } = await supabase
      .from('collecteurs')
      .select('position_lat, position_lng, position_updated_at, profiles(prenom, nom)')
      .eq('id', demande.collecteur_id)
      .single()
    collecteurPosition = col
  }

  // Profil collecteur (pour la preuve de livraison)
  let collecteurNom = ''
  if (demande.collecteur_id) {
    const { data: cp } = await supabase
      .from('profiles')
      .select('prenom, nom')
      .eq('id', demande.collecteur_id)
      .single()
    if (cp) collecteurNom = `${cp.prenom} ${cp.nom}`
  }

  const statut = demande.statut as StatutDemande
  const showGPS = demande.type_variante === 'intra_ville' && statut === 'collectee'

  // Preuve de livraison (depuis statuts_historique)
  let preuveLivraison: { signatureBase64: string | null; photoBase64: string | null; date: string } | null = null
  if (statut === 'livree' && historique) {
    const entryLivree = (historique as StatutHistorique[]).find((h) => h.statut_apres === 'livree')
    if (entryLivree?.commentaire) {
      try {
        const parsed = JSON.parse(entryLivree.commentaire)
        if (parsed?.type === 'livraison_confirmee') {
          preuveLivraison = {
            signatureBase64: parsed.signatureBase64 ?? null,
            photoBase64: parsed.photoBase64 ?? null,
            date: entryLivree.created_at,
          }
        }
      } catch { /* commentaire plain text, pas de preuve */ }
    }
  }

  const dateFormatée = new Date(demande.created_at).toLocaleString('fr-MA', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/mes-demandes" className="text-xs text-gray-400 hover:text-[#CC0000] transition-colors">
            ← Mes demandes
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900 font-mono">{demande.reference}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{dateFormatée}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatutBadge statut={statut} />
          {statut === 'en_attente' && (
            <AnnulerDemandeButton id={id} />
          )}
        </div>
      </div>

      {/* Adresse de collecte */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Adresse de collecte</h2>
        <div className="flex gap-3 items-start">
          <div className="h-7 w-7 rounded-full bg-[#CC0000] flex items-center justify-center shrink-0">
            <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-900 leading-relaxed">{demande.adresse_collecte_texte}</p>
            <p className="text-xs text-gray-400 mt-1">
              Type : {demande.type_variante === 'intra_ville' ? 'Intra-ville' : 'Inter-ville'}
              {' · '}Mode : {demande.mode_paiement === 'especes' ? 'Espèces' : 'En ligne'}
            </p>
          </div>
        </div>
      </section>

      {/* Suivi GPS — intra-ville collectée */}
      {showGPS && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Suivi en temps réel</h2>
          <SuiviGPS
            lat={collecteurPosition?.position_lat ?? null}
            lng={collecteurPosition?.position_lng ?? null}
            collecteurId={demande.collecteur_id}
            collecteurNom={
              collecteurPosition?.profiles
                ? (() => {
                    const p = Array.isArray(collecteurPosition.profiles)
                      ? collecteurPosition.profiles[0]
                      : collecteurPosition.profiles as { prenom: string; nom: string }
                    return p ? `${p.prenom} ${p.nom}` : undefined
                  })()
                : undefined
            }
            updatedAt={collecteurPosition?.position_updated_at}
          />
        </section>
      )}

      {/* Colis */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {colisList?.length ?? 0} colis — Total {demande.montant_total} MAD
        </h2>
        <div className="flex flex-col gap-3">
          {(colisList as Colis[])?.map((c) => (
            <ColisQRCard key={c.id} colis={c} demandeRef={demande.reference} />
          ))}
        </div>
      </section>

      {/* Preuve de livraison */}
      {preuveLivraison && (
        <section className="bg-white border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h2 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Preuve de livraison</h2>
          </div>
          <PreuveLivraison
            signatureBase64={preuveLivraison.signatureBase64}
            photoBase64={preuveLivraison.photoBase64}
            dateLivraison={preuveLivraison.date}
            collecteurNom={collecteurNom}
          />
        </section>
      )}

      {/* Timeline */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Historique</h2>
        <TimelineStatuts historique={(historique as StatutHistorique[]) ?? []} />
      </section>
    </div>
  )
}
