import { createClient } from '@/lib/supabase/server'
import MissionCard from '@/components/collecteur/MissionCard'

export const dynamic = 'force-dynamic'

const STATUT_ORDER: Record<string, number> = {
  en_cours:  0,
  collectee: 1,
  affectee:  2,
  anomalie:  3,
}

export default async function MissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: demandes } = await supabase
    .from('demandes')
    .select('id, reference, adresse_collecte_texte, statut, type_variante, notes, colis(id)')
    .eq('collecteur_id', user!.id)
    .in('statut', ['affectee', 'en_cours', 'collectee', 'anomalie'])
    .order('updated_at', { ascending: false })

  const missions = (demandes ?? [])
    .map((d) => ({
      id: d.id,
      reference: d.reference,
      adresse_collecte_texte: d.adresse_collecte_texte,
      statut: d.statut,
      type_variante: d.type_variante as 'intra_ville' | 'inter_ville',
      nb_colis: Array.isArray(d.colis) ? d.colis.length : 0,
      notes: d.notes,
    }))
    .sort((a, b) => (STATUT_ORDER[a.statut] ?? 99) - (STATUT_ORDER[b.statut] ?? 99))

  // collectee intra-ville = encore active (bouton "Livrer")
  const actives = missions.filter(
    (m) =>
      ['affectee', 'en_cours'].includes(m.statut) ||
      (m.statut === 'collectee' && m.type_variante === 'intra_ville')
  )
  // collectee inter-ville ou anomalie = terminée côté collecteur
  const terminees = missions.filter(
    (m) =>
      m.statut === 'anomalie' ||
      (m.statut === 'collectee' && m.type_variante === 'inter_ville')
  )

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total',     value: missions.length,  color: 'text-gray-900' },
          { label: 'En cours',  value: actives.length,   color: 'text-amber-600' },
          { label: 'Terminées', value: terminees.length, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active missions */}
      {actives.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Missions actives
          </h2>
          <div className="flex flex-col gap-3">
            {actives.map((m) => <MissionCard key={m.id} mission={m} />)}
          </div>
        </section>
      )}

      {/* Completed missions */}
      {terminees.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Terminées aujourd&apos;hui
          </h2>
          <div className="flex flex-col gap-3">
            {terminees.map((m) => <MissionCard key={m.id} mission={m} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {missions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Aucune mission affectée</p>
          <p className="text-xs text-gray-400 text-center">Le chef de centre vous affectera des missions prochainement</p>
        </div>
      )}
    </div>
  )
}
