import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import DemandeCard from '@/components/client/demandes/DemandeCard'
import FiltresDemandes from '@/components/client/demandes/FiltresDemandes'
import type { StatutDemande } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{ statut?: string; periode?: string; ref?: string }>
}

function periodeToDate(periode: string | undefined): string | null {
  if (!periode) return null
  const now = new Date()
  if (periode === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (periode === 'week') {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  if (periode === 'month') {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
  return null
}

async function DemandesList({ statut, periode, ref }: { statut?: string; periode?: string; ref?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('demandes')
    .select('id, reference, statut, created_at, adresse_collecte_texte, montant_total, colis(count)')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })

  if (statut) query = query.eq('statut', statut as StatutDemande)

  const depuis = periodeToDate(periode)
  if (depuis) query = query.gte('created_at', depuis)

  if (ref) query = query.ilike('reference', `%${ref}%`)

  const { data: demandes } = await query

  if (!demandes?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-gray-400 text-sm">Aucune demande trouvée.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {demandes.map((d) => {
        const colisArr = d.colis as unknown as { count: number }[]
        const nbColis = colisArr?.[0]?.count ?? 0
        return (
          <DemandeCard
            key={d.id}
            id={d.id}
            reference={d.reference}
            statut={d.statut as StatutDemande}
            createdAt={d.created_at}
            nombreColis={nbColis}
            montantTotal={d.montant_total}
            adresseCollecte={d.adresse_collecte_texte}
          />
        )
      })}
    </div>
  )
}

export default async function MesDemandesPage({ searchParams }: PageProps) {
  const { statut, periode, ref } = await searchParams

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
        <p className="mt-1 text-sm text-gray-500">Historique et suivi de toutes vos demandes</p>
      </div>

      {/* Filtres */}
      <div className="mb-5">
        <Suspense fallback={null}>
          <FiltresDemandes />
        </Suspense>
      </div>

      {/* Liste */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <DemandesList statut={statut} periode={periode} ref={ref} />
      </Suspense>
    </div>
  )
}
