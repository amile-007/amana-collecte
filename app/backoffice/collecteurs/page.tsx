import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CollecteursBO from '@/components/backoffice/collecteurs/CollecteursBO'
import type { CollecteurPourBO } from '@/components/backoffice/collecteurs/CollecteursBO'

export default async function CollecteursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('centre_id')
    .eq('id', user.id)
    .single()

  const centreId = profile?.centre_id ?? ''

  // Collecteurs du centre
  const { data: rawCollecteurs } = centreId
    ? await supabase
        .from('collecteurs')
        .select('id, statut, zone_intervention, position_lat, position_lng, position_updated_at')
        .eq('centre_id', centreId)
    : { data: [] }

  const collecteurIds = rawCollecteurs?.map((c) => c.id) ?? []

  // Profils (nom, prénom, téléphone, actif)
  const { data: collecteurProfiles } = collecteurIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, nom, prenom, telephone, actif')
        .in('id', collecteurIds)
    : { data: [] }

  // Missions aujourd'hui par collecteur
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: missionsAujourd } = collecteurIds.length > 0
    ? await supabase
        .from('demandes')
        .select('collecteur_id')
        .in('collecteur_id', collecteurIds)
        .gte('updated_at', today.toISOString())
        .in('statut', ['en_cours', 'collectee', 'livree', 'deposee_centre'])
    : { data: [] }

  const missionsMap: Record<string, number> = {}
  missionsAujourd?.forEach((d) => {
    if (d.collecteur_id) missionsMap[d.collecteur_id] = (missionsMap[d.collecteur_id] ?? 0) + 1
  })

  const collecteurs: CollecteurPourBO[] = (rawCollecteurs ?? []).map((c) => {
    const p = collecteurProfiles?.find((pr) => pr.id === c.id)
    return {
      id: c.id,
      nom: p?.nom ?? '',
      prenom: p?.prenom ?? '',
      telephone: p?.telephone ?? '',
      actif: p?.actif ?? true,
      statut: c.statut,
      zone_intervention: c.zone_intervention,
      position_lat: c.position_lat,
      position_lng: c.position_lng,
      position_updated_at: c.position_updated_at,
      missions_aujourd_hui: missionsMap[c.id] ?? 0,
    }
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collecteurs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez l&apos;équipe de collecteurs de votre centre
        </p>
      </div>
      <CollecteursBO initial={collecteurs} />
    </div>
  )
}
