import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnomaliesBO from '@/components/backoffice/anomalies/AnomaliesBO'
import type { AnomaliePourBO } from '@/components/backoffice/anomalies/AnomaliesBO'
import type { CollecteurAvecProfil } from '@/lib/types'

export default async function AnomaliesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('centre_id')
    .eq('id', user.id)
    .single()

  const centreId = profile?.centre_id ?? ''

  const { data: rawAnomalies } = await supabase
    .from('anomalies')
    .select('id, demande_id, collecteur_id, type_anomalie, commentaire, photo_urls, statut_traitement, created_at')
    .eq('statut_traitement', 'ouverte')
    .order('created_at', { ascending: false })

  const demandeIds = [...new Set(rawAnomalies?.map((a) => a.demande_id) ?? [])]
  const collecteurIds = [...new Set(rawAnomalies?.map((a) => a.collecteur_id) ?? [])]

  const [{ data: demandes }, { data: collecteurProfiles }] = await Promise.all([
    demandeIds.length > 0
      ? supabase.from('demandes').select('id, reference, adresse_collecte_texte').in('id', demandeIds)
      : Promise.resolve({ data: [] }),
    collecteurIds.length > 0
      ? supabase.from('profiles').select('id, nom, prenom').in('id', collecteurIds)
      : Promise.resolve({ data: [] }),
  ])

  const demandeMap: Record<string, { reference: string; adresse: string }> = {}
  demandes?.forEach((d) => { demandeMap[d.id] = { reference: d.reference, adresse: d.adresse_collecte_texte } })

  const profileMap: Record<string, { nom: string; prenom: string }> = {}
  collecteurProfiles?.forEach((p) => { profileMap[p.id] = { nom: p.nom, prenom: p.prenom } })

  const anomalies: AnomaliePourBO[] = (rawAnomalies ?? []).map((a) => ({
    ...a,
    demande_reference: demandeMap[a.demande_id]?.reference ?? '',
    demande_adresse: demandeMap[a.demande_id]?.adresse ?? '',
    collecteur_nom: profileMap[a.collecteur_id]
      ? `${profileMap[a.collecteur_id].prenom} ${profileMap[a.collecteur_id].nom}`
      : '',
  }))

  const { data: rawCollecteurs } = centreId
    ? await supabase
        .from('collecteurs')
        .select('id, statut, zone_intervention, centre_id, capacite_max_kg, position_lat, position_lng, position_updated_at')
        .eq('centre_id', centreId)
    : { data: [] }

  const allCollecteurIds = rawCollecteurs?.map((c) => c.id) ?? []
  const { data: allCollecteurProfiles } = allCollecteurIds.length > 0
    ? await supabase.from('profiles').select('id, nom, prenom, telephone').in('id', allCollecteurIds)
    : { data: [] }

  const collecteurs: CollecteurAvecProfil[] = (rawCollecteurs ?? []).map((c) => {
    const p = allCollecteurProfiles?.find((pr) => pr.id === c.id)
    return { ...c, nom: p?.nom ?? '', prenom: p?.prenom ?? '', telephone: p?.telephone ?? '' }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anomalies</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les anomalies déclarées par les collecteurs
          </p>
        </div>
        {anomalies.length > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-[#CC0000]">
            {anomalies.length} ouverte{anomalies.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <AnomaliesBO initial={anomalies} collecteurs={collecteurs} centreId={centreId} />
    </div>
  )
}
