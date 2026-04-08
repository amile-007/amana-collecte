'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Clock, Users, PackageCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface KPIs {
  demandesEnAttente: number
  collecteursDisponibles: number
  demandesCollecteesAujourdhui: number
  anomaliesOuvertes: number
  tauxCompletion: number
}

const CARDS = [
  {
    key: 'demandesEnAttente' as const,
    label: 'Demandes en attente',
    Icon: Clock,
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
    iconBg: 'bg-orange-100',
    href: '/backoffice/demandes?statut=en_attente',
  },
  {
    key: 'collecteursDisponibles' as const,
    label: 'Collecteurs disponibles',
    Icon: Users,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    iconBg: 'bg-green-100',
    href: '/backoffice/collecteurs?statut=disponible',
  },
  {
    key: 'demandesCollecteesAujourdhui' as const,
    label: "Collectées aujourd'hui",
    Icon: PackageCheck,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100',
    href: '/backoffice/demandes?statut=collectee&periode=today',
  },
  {
    key: 'anomaliesOuvertes' as const,
    label: 'Anomalies ouvertes',
    Icon: AlertTriangle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-[#CC0000]',
    iconBg: 'bg-red-100',
    href: '/backoffice/anomalies',
  },
]

async function fetchKPIs(centreId: string): Promise<KPIs> {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  const centreFilter = centreId
    ? `centre_id.eq.${centreId},centre_id.is.null`
    : 'centre_id.is.null'

  const [
    { count: enAttente },
    { count: disponibles },
    { count: collectees },
    { count: anomalies },
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

  const taux = (totalJour ?? 0) > 0
    ? Math.round(((livrees ?? 0) / (totalJour ?? 1)) * 100)
    : 0

  return {
    demandesEnAttente: enAttente ?? 0,
    collecteursDisponibles: disponibles ?? 0,
    demandesCollecteesAujourdhui: collectees ?? 0,
    anomaliesOuvertes: anomalies ?? 0,
    tauxCompletion: taux,
  }
}

export default function DashboardStats({ initial, centreId }: { initial: KPIs; centreId: string }) {
  const [kpis, setKpis] = useState(initial)
  // Null initial pour éviter le hydration mismatch (new Date() diffère server/client)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const updated = await fetchKPIs(centreId)
    setKpis(updated)
    setLastUpdate(new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }, [centreId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard:${centreId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anomalies' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collecteurs' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [centreId, refresh])

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={`rounded-xl border p-5 flex flex-col group transition-all hover:shadow-md hover:border-[#CC0000]/40 cursor-pointer ${card.bg} ${card.border}`}
          >
            <div className="flex items-start justify-between">
              <div className={`h-9 w-9 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                <card.Icon className={`h-5 w-5 ${card.text}`} />
              </div>
              <ArrowRight className={`h-4 w-4 ${card.text} opacity-0 group-hover:opacity-100 transition-opacity mt-0.5`} />
            </div>
            <p className={`text-4xl font-bold mt-3 ${card.text}`}>{kpis[card.key]}</p>
            <p className="text-xs text-gray-500 mt-1 leading-snug">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Taux de complétion */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">
            Taux de complétion <span className="font-normal text-gray-400">(aujourd&apos;hui)</span>
          </p>
          <span className="text-2xl font-bold text-[#CC0000]">{kpis.tauxCompletion}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-[#CC0000] transition-all duration-700"
            style={{ width: `${kpis.tauxCompletion}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          {lastUpdate ? `Mis à jour à ${lastUpdate} · ` : ''}Temps réel activé
        </p>
      </div>
    </div>
  )
}
