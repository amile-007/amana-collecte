import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Compteurs rapides
  const { count: totalDemandes } = await supabase
    .from('demandes')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user!.id)

  const { count: enCours } = await supabase
    .from('demandes')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user!.id)
    .in('statut', ['en_attente', 'affectee', 'en_cours', 'collectee'])

  const { count: livrees } = await supabase
    .from('demandes')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user!.id)
    .eq('statut', 'livree')

  const stats = [
    { label: 'Total demandes', value: totalDemandes ?? 0, color: 'text-gray-900' },
    { label: 'En cours', value: enCours ?? 0, color: 'text-blue-600' },
    { label: 'Livrées', value: livrees ?? 0, color: 'text-green-600' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Vue d&apos;ensemble de vos demandes de collecte</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* CTA nouvelle demande */}
      <div className="bg-[#CC0000] rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-lg">Créer une nouvelle demande</p>
          <p className="text-red-200 text-sm mt-1">Planifiez la collecte de vos colis en quelques minutes</p>
        </div>
        <a
          href="/nouvelle-demande"
          className="shrink-0 bg-white text-[#CC0000] font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Commencer →
        </a>
      </div>
    </div>
  )
}
