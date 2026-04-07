import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardStats from '@/components/backoffice/dashboard/DashboardStats'
import type { KPIs } from '@/components/backoffice/dashboard/DashboardStats'

export default async function DashboardPage() {
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const [
    { count: demandesEnAttente },
    { count: collecteursDisponibles },
    { count: demandesCollecteesAujourdhui },
    { count: anomaliesOuvertes },
    { count: livrees },
    { count: totalJour },
  ] = await Promise.all([
    supabase.from('demandes').select('*', { count: 'exact', head: true }).or(centreFilter).eq('statut', 'en_attente'),
    supabase.from('collecteurs').select('*', { count: 'exact', head: true }).eq('centre_id', centreId).eq('statut', 'disponible'),
    supabase.from('demandes').select('*', { count: 'exact', head: true }).or(centreFilter).in('statut', ['collectee', 'livree', 'deposee_centre']).gte('updated_at', todayStr),
    supabase.from('anomalies').select('*', { count: 'exact', head: true }).eq('statut_traitement', 'ouverte'),
    supabase.from('demandes').select('*', { count: 'exact', head: true }).or(centreFilter).in('statut', ['livree', 'deposee_centre']).gte('created_at', todayStr),
    supabase.from('demandes').select('*', { count: 'exact', head: true }).or(centreFilter).gte('created_at', todayStr).neq('statut', 'annulee'),
  ])

  const initial: KPIs = {
    demandesEnAttente: demandesEnAttente ?? 0,
    collecteursDisponibles: collecteursDisponibles ?? 0,
    demandesCollecteesAujourdhui: demandesCollecteesAujourdhui ?? 0,
    anomaliesOuvertes: anomaliesOuvertes ?? 0,
    tauxCompletion: (totalJour ?? 0) > 0
      ? Math.round(((livrees ?? 0) / (totalJour ?? 1)) * 100)
      : 0,
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d&apos;ensemble en temps réel de votre centre
        </p>
      </div>
      <DashboardStats initial={initial} centreId={centreId} />
    </div>
  )
}
