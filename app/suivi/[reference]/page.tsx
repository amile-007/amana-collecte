import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

interface PageProps {
  params: Promise<{ reference: string }>
}

// Client Supabase côté serveur uniquement — service role pour lecture publique
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params
  const ref = decodeURIComponent(reference).toUpperCase()
  return {
    title: `Suivi colis AMANA — ${ref}`,
    description: `Suivez l'état de votre colis AMANA référence ${ref}`,
    robots: 'noindex',
  }
}

// ─── Labels statuts ────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: string }> = {
  en_attente:     { label: 'En attente',      bg: 'bg-gray-100',    text: 'text-gray-700',   dot: 'bg-gray-400',    icon: '⏳' },
  affectee:       { label: 'Collecteur assigné', bg: 'bg-blue-100', text: 'text-blue-700',   dot: 'bg-blue-500',    icon: '👤' },
  en_cours:       { label: 'En cours de collecte', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', icon: '🚗' },
  collectee:      { label: 'Collectée',       bg: 'bg-teal-100',    text: 'text-teal-700',   dot: 'bg-teal-500',    icon: '📦' },
  en_transit:     { label: 'En transit',      bg: 'bg-purple-100',  text: 'text-purple-700', dot: 'bg-purple-500',  icon: '🚚' },
  livree:         { label: 'Livrée',          bg: 'bg-green-100',   text: 'text-green-700',  dot: 'bg-green-500',   icon: '✅' },
  deposee_centre: { label: 'Déposée au centre', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', icon: '🏢' },
  en_instance:    { label: 'En instance',     bg: 'bg-orange-100',  text: 'text-orange-700', dot: 'bg-orange-500',  icon: '⚠️' },
  retournee:      { label: 'Retournée',       bg: 'bg-yellow-100',  text: 'text-yellow-700', dot: 'bg-yellow-500',  icon: '↩️' },
  anomalie:       { label: 'Anomalie',        bg: 'bg-red-100',     text: 'text-red-700',    dot: 'bg-red-500',     icon: '🔴' },
  annulee:        { label: 'Annulée',         bg: 'bg-gray-100',    text: 'text-gray-500',   dot: 'bg-gray-300',    icon: '❌' },
}

const TIMELINE_LABELS: Record<string, string> = {
  en_attente:     'Demande créée',
  affectee:       'Collecteur assigné',
  en_cours:       'Collecte démarrée',
  collectee:      'Colis collecté',
  en_transit:     'En transit',
  livree:         'Livraison confirmée',
  deposee_centre: 'Déposé au centre',
  en_instance:    'Tentative de livraison',
  retournee:      'Retourné à l\'expéditeur',
  anomalie:       'Incident signalé',
  annulee:        'Demande annulée',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-MA', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateCourt(iso: string) {
  return new Date(iso).toLocaleString('fr-MA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function SuiviReferencePage({ params }: PageProps) {
  const { reference: rawRef } = await params
  const reference = decodeURIComponent(rawRef).toUpperCase()

  const supabase = createAdminClient()

  // Demande (champs publics uniquement — pas de client_id exposé)
  const { data: demande } = await supabase
    .from('demandes')
    .select('id, reference, statut, type_variante, created_at, updated_at, centre_id')
    .eq('reference', reference)
    .single()

  if (!demande) notFound()

  // Historique statuts (sans acteur_id)
  const { data: historique } = await supabase
    .from('statuts_historique')
    .select('id, statut_apres, acteur_role, created_at')
    .eq('demande_id', demande.id)
    .order('created_at', { ascending: true })

  // Villes de destination (sans données personnelles)
  const { data: colis } = await supabase
    .from('colis')
    .select('destination_ville, statut')
    .eq('demande_id', demande.id)

  // Centre (si en_instance ou deposee_centre)
  let centreInfo: { nom: string; adresse: string; ville: string } | null = null
  if (demande.centre_id && ['en_instance', 'deposee_centre'].includes(demande.statut)) {
    const { data: centre } = await supabase
      .from('centres')
      .select('nom, adresse, ville')
      .eq('id', demande.centre_id)
      .single()
    if (centre) centreInfo = centre
  }

  const statutCfg = STATUT_CONFIG[demande.statut] ?? {
    label: demande.statut, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', icon: '📋'
  }

  const villes = [...new Set((colis ?? []).map((c) => c.destination_ville).filter(Boolean))]

  // Trouver l'entrée "livree" dans l'historique pour afficher la date de livraison
  const entryLivree = historique?.find((h) => h.statut_apres === 'livree')
  // Date limite retrait en instance (7 jours après la mise en instance)
  const entryInstance = historique?.find((h) => h.statut_apres === 'en_instance')
  const dateLimiteRetrait = entryInstance
    ? new Date(new Date(entryInstance.created_at).getTime() + 7 * 24 * 3600 * 1000)
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/images/amana-logo.svg" alt="AMANA" width={120} height={32} />
          <span className="text-sm text-gray-400 hidden sm:inline">· Suivi de colis</span>
        </div>
        <Link href="/suivi" className="text-xs text-gray-500 hover:text-[#E30613] transition-colors">
          ← Nouvelle recherche
        </Link>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full">

        {/* Référence + statut */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Référence</p>
              <p className="text-xl font-bold font-mono text-gray-900">{demande.reference}</p>
              <p className="text-xs text-gray-400 mt-1">
                {demande.type_variante === 'intra_ville' ? 'Livraison intra-ville' : 'Livraison inter-ville'}
                {villes.length > 0 && ` · ${villes.join(', ')}`}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold shrink-0 ${statutCfg.bg} ${statutCfg.text}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${statutCfg.dot}`} />
              {statutCfg.label}
            </span>
          </div>

          {/* Info retournée */}
          {demande.statut === 'retournee' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-xs font-semibold text-yellow-700">↩️ Colis retourné à l&apos;expéditeur</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Ce colis n&apos;a pas pu être livré et a été retourné à son expéditeur.
              </p>
            </div>
          )}

          {/* Info livraison */}
          {demande.statut === 'livree' && entryLivree && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Livré le {formatDate(entryLivree.created_at)}
              </p>
            </div>
          )}

          {/* Info en instance */}
          {demande.statut === 'en_instance' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs font-semibold text-orange-700">⚠️ Colis en instance de retrait</p>
              {centreInfo && (
                <p className="text-xs text-orange-600 mt-1">
                  {centreInfo.nom} — {centreInfo.adresse}, {centreInfo.ville}
                </p>
              )}
              {dateLimiteRetrait && (
                <p className="text-xs text-orange-600 mt-0.5">
                  À retirer avant le{' '}
                  <strong>{dateLimiteRetrait.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">
            Historique des événements
          </h2>
          {!historique || historique.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun événement enregistré.</p>
          ) : (
            <ol className="relative flex flex-col gap-0 border-l-2 border-gray-100 ml-3">
              {historique.map((entry, i) => {
                const isLast = i === historique.length - 1
                const cfg = STATUT_CONFIG[entry.statut_apres]
                return (
                  <li key={entry.id} className="relative pl-6 pb-5 last:pb-0">
                    <span className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center ${isLast ? cfg?.dot ?? 'bg-[#E30613]' : 'bg-gray-200'}`}>
                      {isLast && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${isLast ? 'text-gray-900' : 'text-gray-500'}`}>
                        {TIMELINE_LABELS[entry.statut_apres] ?? entry.statut_apres.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateCourt(entry.created_at)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* CTA inscription */}
        <div className="bg-[#E30613]/5 border border-[#E30613]/20 rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-gray-900 mb-1">Gérez vos colis en temps réel</p>
          <p className="text-xs text-gray-500 mb-4">
            Créez un compte AMANA pour suivre vos livraisons, recevoir des notifications et créer des demandes en ligne.
          </p>
          <a
            href="/register"
            className="inline-block bg-[#E30613] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#c00510] transition-colors"
          >
            Créer un compte gratuit
          </a>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Besoin d&apos;aide ?{' '}
          <a href="tel:+212537000000" className="text-[#E30613] hover:underline">
            Contactez le service client
          </a>
        </p>
      </main>
    </div>
  )
}
