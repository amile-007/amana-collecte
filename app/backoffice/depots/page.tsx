import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DepotsBO from '@/components/backoffice/depots/DepotsBO'
import type { DepotPourBO } from '@/components/backoffice/depots/DepotsBO'

export default async function DepotsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('centre_id')
    .eq('id', user.id)
    .single()

  const centreId = profile?.centre_id ?? ''

  // Dépôts en attente pour ce centre
  const { data: rawDepots } = centreId
    ? await supabase
        .from('depots')
        .select('id, collecteur_id, centre_id, statut, montant_especes_attendu, montant_especes_verse, created_at')
        .eq('centre_id', centreId)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false })
    : { data: [] }

  const collecteurIds = [...new Set(rawDepots?.map((d) => d.collecteur_id) ?? [])]

  // Profils collecteurs
  const { data: collecteurProfiles } = collecteurIds.length > 0
    ? await supabase.from('profiles').select('id, nom, prenom').in('id', collecteurIds)
    : { data: [] }

  const profileMap: Record<string, string> = {}
  collecteurProfiles?.forEach((p) => {
    profileMap[p.id] = `${p.prenom} ${p.nom}`
  })

  // Nombre de demandes collectées/déposées par collecteur aujourd'hui
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: missionsJour } = collecteurIds.length > 0
    ? await supabase
        .from('demandes')
        .select('collecteur_id')
        .in('collecteur_id', collecteurIds)
        .in('statut', ['collectee', 'deposee_centre', 'livree'])
        .gte('updated_at', today.toISOString())
    : { data: [] }

  const nbDemandesMap: Record<string, number> = {}
  missionsJour?.forEach((d) => {
    if (d.collecteur_id) nbDemandesMap[d.collecteur_id] = (nbDemandesMap[d.collecteur_id] ?? 0) + 1
  })

  const depots: DepotPourBO[] = (rawDepots ?? []).map((d) => ({
    id: d.id,
    collecteur_id: d.collecteur_id,
    collecteur_nom: profileMap[d.collecteur_id] ?? '—',
    statut: d.statut,
    montant_especes_attendu: d.montant_especes_attendu ?? 0,
    montant_especes_verse: d.montant_especes_verse,
    created_at: d.created_at,
    nb_demandes: nbDemandesMap[d.collecteur_id] ?? 0,
  }))

  const totalAttendu = depots.reduce((s, d) => s + d.montant_especes_attendu, 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépôts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Validation des dépôts espèces des collecteurs
          </p>
        </div>
        {depots.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Total attendu</p>
            <p className="text-xl font-bold text-gray-900">{totalAttendu.toFixed(2)} MAD</p>
          </div>
        )}
      </div>
      <DepotsBO initial={depots} />
    </div>
  )
}
