import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/shared/StatusBadge'
import PreuveLivraison from '@/components/shared/PreuveLivraison'
import TimelineStatuts from '@/components/client/demandes/TimelineStatuts'
import type { StatutDemande, Colis, StatutHistorique } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-MA', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function DetailDemandeBO({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, centre_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['chef_centre', 'admin'].includes(profile.role)) redirect('/login')

  // Demande
  const { data: demande } = await supabase
    .from('demandes')
    .select('*')
    .eq('id', id)
    .single()

  if (!demande) notFound()

  // Restriction centre (chef_centre ne voit que son centre)
  if (profile.role === 'chef_centre' && profile.centre_id && demande.centre_id !== profile.centre_id) {
    notFound()
  }

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

  // Profil client
  let clientNom = '—'
  if (demande.client_id) {
    const { data: cp } = await supabase
      .from('profiles')
      .select('prenom, nom, telephone')
      .eq('id', demande.client_id)
      .single()
    if (cp) clientNom = `${cp.prenom} ${cp.nom}`
  }

  // Profil collecteur
  let collecteurNom = '—'
  let collecteurTel = ''
  if (demande.collecteur_id) {
    const { data: cp } = await supabase
      .from('profiles')
      .select('prenom, nom, telephone')
      .eq('id', demande.collecteur_id)
      .single()
    if (cp) { collecteurNom = `${cp.prenom} ${cp.nom}`; collecteurTel = cp.telephone }
  }

  // Nom du centre
  let centreNom = '—'
  if (demande.centre_id) {
    const { data: centre } = await supabase
      .from('centres')
      .select('nom')
      .eq('id', demande.centre_id)
      .single()
    if (centre) centreNom = centre.nom
  }

  const statut = demande.statut as StatutDemande

  // Preuve de livraison
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
      } catch { /* commentaire plain text */ }
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/backoffice/demandes" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← Demandes
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900 font-mono">{demande.reference}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(demande.created_at)}</p>
        </div>
        <StatusBadge statut={statut} size="md" dot />
      </div>

      {/* Infos générales */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Informations</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Client</p>
            <p className="font-medium text-gray-900">{clientNom}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Collecteur</p>
            <p className="font-medium text-gray-900">{collecteurNom}</p>
            {collecteurTel && <p className="text-xs text-gray-400">{collecteurTel}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400">Centre</p>
            <p className="font-medium text-gray-900">{centreNom}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Variante</p>
            <p className="font-medium text-gray-900">
              {demande.type_variante === 'intra_ville' ? 'Intra-ville' : 'Inter-ville'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Montant total</p>
            <p className="font-medium text-gray-900">{demande.montant_total ?? '—'} MAD</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Paiement</p>
            <p className="font-medium text-gray-900">
              {demande.mode_paiement === 'especes' ? 'Espèces' : 'En ligne'}
              {' · '}
              <span className={demande.paiement_statut === 'confirme' ? 'text-green-600' : 'text-orange-600'}>
                {demande.paiement_statut === 'confirme' ? 'Confirmé' : demande.paiement_statut === 'echoue' ? 'Échoué' : 'En attente'}
              </span>
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">Adresse de collecte</p>
            <p className="font-medium text-gray-900">{demande.adresse_collecte_texte}</p>
          </div>
          {demande.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Notes</p>
              <p className="text-gray-700 italic">{demande.notes}</p>
            </div>
          )}
        </div>
      </section>

      {/* Colis */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {colisList?.length ?? 0} colis — Total {demande.montant_total ?? '—'} MAD
        </h2>
        <div className="flex flex-col gap-3">
          {(colisList as Colis[])?.map((c) => (
            <div key={c.id} className="border border-gray-100 rounded-lg p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500">{c.reference}</span>
                <span className="text-xs text-gray-400">{c.destination_ville}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.destinataire_nom}</p>
              <p className="text-xs text-gray-500">{c.destinataire_telephone}</p>
              {c.destinataire_adresse && (
                <p className="text-xs text-gray-400 mt-0.5">{c.destinataire_adresse}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>Poids déclaré : <strong className="text-gray-700">{c.poids_declare} kg</strong></span>
                <span>Vol. : <strong className="text-gray-700">{c.poids_volumetrique?.toFixed(2)} kg</strong></span>
                <span>Réf. : <strong className="text-gray-700">{c.poids_reference?.toFixed(2)} kg</strong></span>
              </div>
              {c.tarif_unitaire !== null && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Tarif : <strong className="text-gray-700">{c.tarif_unitaire} MAD</strong>
                </p>
              )}
            </div>
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
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Historique des statuts</h2>
        <TimelineStatuts historique={(historique as StatutHistorique[]) ?? []} />
      </section>
    </div>
  )
}
