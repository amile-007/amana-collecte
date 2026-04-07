import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DemandesBO from '@/components/backoffice/demandes/DemandesBO'
import type { DemandePourBO } from '@/components/backoffice/demandes/DemandesBO'
import type { CollecteurAvecProfil } from '@/lib/types'

export default async function DemandesPage() {
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

  // Demandes avec colis
  const { data: rawDemandes } = await supabase
    .from('demandes')
    .select('id, reference, statut, type_variante, adresse_collecte_texte, montant_total, created_at, client_id, collecteur_id, colis(id)')
    .or(centreFilter)
    .order('created_at', { ascending: false })
    .limit(200)

  const allProfileIds = [
    ...new Set([
      ...(rawDemandes?.map((d) => d.client_id) ?? []),
      ...(rawDemandes?.map((d) => d.collecteur_id).filter(Boolean) ?? []),
    ]),
  ]

  const { data: profiles } = allProfileIds.length > 0
    ? await supabase.from('profiles').select('id, nom, prenom').in('id', allProfileIds)
    : { data: [] }

  const profileMap: Record<string, { nom: string; prenom: string }> = {}
  profiles?.forEach((p) => { profileMap[p.id] = { nom: p.nom, prenom: p.prenom } })

  const demandes: DemandePourBO[] = (rawDemandes ?? []).map((d) => {
    const client = profileMap[d.client_id]
    const col = d.collecteur_id ? profileMap[d.collecteur_id] : null
    return {
      id: d.id,
      reference: d.reference,
      statut: d.statut,
      type_variante: d.type_variante,
      adresse_collecte_texte: d.adresse_collecte_texte,
      montant_total: d.montant_total,
      created_at: d.created_at,
      client_id: d.client_id,
      collecteur_id: d.collecteur_id ?? null,
      client_nom: client ? `${client.prenom} ${client.nom}` : '—',
      collecteur_nom: col ? `${col.prenom} ${col.nom}` : null,
      nb_colis: Array.isArray(d.colis) ? d.colis.length : 0,
    }
  })

  // Collecteurs du centre
  const { data: rawCollecteurs } = centreId
    ? await supabase
        .from('collecteurs')
        .select('id, statut, zone_intervention, centre_id, capacite_max_kg, position_lat, position_lng, position_updated_at')
        .eq('centre_id', centreId)
    : { data: [] }

  const collecteurIds = rawCollecteurs?.map((c) => c.id) ?? []
  const { data: collecteurProfiles } = collecteurIds.length > 0
    ? await supabase.from('profiles').select('id, nom, prenom, telephone').in('id', collecteurIds)
    : { data: [] }

  const collecteurs: CollecteurAvecProfil[] = (rawCollecteurs ?? []).map((c) => {
    const p = collecteurProfiles?.find((pr) => pr.id === c.id)
    return {
      ...c,
      nom: p?.nom ?? '',
      prenom: p?.prenom ?? '',
      telephone: p?.telephone ?? '',
    }
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez et affectez les demandes de collecte de votre centre
        </p>
      </div>
      <DemandesBO demandes={demandes} collecteurs={collecteurs} />
    </div>
  )
}
