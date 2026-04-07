import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import type { DemandeCarte, CollecteurCarte } from '@/components/backoffice/carte/CarteBO'

const CarteBO = dynamic(() => import('@/components/backoffice/carte/CarteBO'), { ssr: false })

export default async function CartePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('centre_id')
    .eq('id', user.id)
    .single()

  const centreId = profile?.centre_id ?? ''
  const centreFilter = centreId
    ? `centre_id.eq.${centreId},centre_id.is.null`
    : 'centre_id.is.null'

  const { data: rawDemandes } = await supabase
    .from('demandes')
    .select('id, reference, statut, adresse_collecte_texte, adresse_collecte_lat, adresse_collecte_lng')
    .or(centreFilter)
    .in('statut', ['en_attente', 'affectee', 'en_cours'])
    .not('adresse_collecte_lat', 'is', null)

  const demandes: DemandeCarte[] = (rawDemandes ?? []).filter(
    (d) => d.adresse_collecte_lat != null && d.adresse_collecte_lng != null
  ) as DemandeCarte[]

  const { data: rawCollecteurs } = centreId
    ? await supabase
        .from('collecteurs')
        .select('id, statut, position_lat, position_lng, position_updated_at')
        .eq('centre_id', centreId)
        .in('statut', ['disponible', 'en_mission'])
    : { data: [] }

  const collecteurIds = rawCollecteurs?.map((c) => c.id) ?? []
  const { data: collecteurProfiles } = collecteurIds.length > 0
    ? await supabase.from('profiles').select('id, nom, prenom').in('id', collecteurIds)
    : { data: [] }

  const collecteurs: CollecteurCarte[] = (rawCollecteurs ?? []).map((c) => {
    const p = collecteurProfiles?.find((pr) => pr.id === c.id)
    return {
      id: c.id,
      statut: c.statut,
      position_lat: c.position_lat ?? null,
      position_lng: c.position_lng ?? null,
      position_updated_at: c.position_updated_at ?? null,
      nom: p?.nom ?? '',
      prenom: p?.prenom ?? '',
    }
  })

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)] gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carte missions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Positions en temps réel des collecteurs et demandes actives
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <CarteBO demandes={demandes} collecteurs={collecteurs} centreId={centreId} />
      </div>
    </div>
  )
}
