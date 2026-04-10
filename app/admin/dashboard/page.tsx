import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

function KpiCard({ label, value, sub, color = 'bg-white' }: KpiCardProps) {
  return (
    <div className={`${color} border border-gray-200 rounded-xl p-5`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Stats globales
  const [
    { count: totalDemandes },
    { count: demandesAujourdhui },
    { count: anomaliesOuvertes },
    { count: collecteursActifs },
    { count: utilisateursTotal },
    { data: demandesParStatut },
    { data: revenuMois },
  ] = await Promise.all([
    supabase.from('demandes').select('*', { count: 'exact', head: true }),
    supabase
      .from('demandes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from('anomalies')
      .select('*', { count: 'exact', head: true })
      .eq('statut_traitement', 'ouverte'),
    supabase
      .from('collecteurs')
      .select('*', { count: 'exact', head: true })
      .in('statut', ['disponible', 'en_mission']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('demandes')
      .select('statut')
      .then(({ data }) => ({
        data: data
          ? Object.entries(
              data.reduce((acc: Record<string, number>, d) => {
                acc[d.statut] = (acc[d.statut] ?? 0) + 1
                return acc
              }, {})
            ).sort((a, b) => b[1] - a[1])
          : [],
      })),
    supabase
      .from('demandes')
      .select('montant_total')
      .in('statut', ['livree', 'deposee_centre'])
      .gte(
        'updated_at',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      )
      .then(({ data }) => ({
        data: data?.reduce((sum, d) => sum + (d.montant_total ?? 0), 0) ?? 0,
      })),
  ])

  const STATUT_LABELS: Record<string, string> = {
    en_attente:      'En attente',
    affectee:        'Affectée',
    en_cours:        'En cours',
    collectee:       'Collectée',
    en_transit:      'En transit',
    livree:          'Livrée',
    deposee_centre:  'Déposée centre',
    en_instance:     'En instance',
    retournee:       'Retournée',
    anomalie:        'Anomalie',
    annulee:         'Annulée',
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">Vue globale de l&apos;activité AMANA Collecte</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Demandes totales" value={totalDemandes ?? 0} />
        <KpiCard label="Demandes aujourd'hui" value={demandesAujourdhui ?? 0} />
        <KpiCard
          label="Revenu du mois"
          value={`${(revenuMois as number).toFixed(0)} MAD`}
          sub="Demandes livrées / déposées"
        />
        <KpiCard
          label="Anomalies ouvertes"
          value={anomaliesOuvertes ?? 0}
          color={anomaliesOuvertes ? 'bg-red-50' : 'bg-white'}
        />
        <KpiCard label="Collecteurs actifs" value={collecteursActifs ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Demandes par statut
          </h2>
          <div className="flex flex-col gap-2">
            {(demandesParStatut as [string, number][]).map(([statut, count]) => (
              <div key={statut} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{STATUT_LABELS[statut] ?? statut}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {!(demandesParStatut as [string, number][]).length && (
              <p className="text-sm text-gray-400 italic">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* Totaux utilisateurs */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Utilisateurs
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-700">Total inscrits</span>
              <span className="text-2xl font-bold text-gray-900">{utilisateursTotal ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Collecteurs actifs</span>
              <span className="text-sm font-semibold text-green-600">{collecteursActifs ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
