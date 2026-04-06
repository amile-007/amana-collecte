import type { StatutDemande } from '@/lib/types'

const CONFIG: Record<StatutDemande, { label: string; cls: string }> = {
  en_attente:     { label: 'En attente',    cls: 'bg-amber-100 text-amber-700' },
  affectee:       { label: 'Affectée',      cls: 'bg-blue-100 text-blue-700' },
  en_cours:       { label: 'En cours',      cls: 'bg-indigo-100 text-indigo-700' },
  collectee:      { label: 'Collectée',     cls: 'bg-purple-100 text-purple-700' },
  en_transit:     { label: 'En transit',    cls: 'bg-purple-100 text-purple-700' },
  livree:         { label: 'Livrée',        cls: 'bg-green-100 text-green-700' },
  deposee_centre: { label: 'Au centre',     cls: 'bg-green-100 text-green-700' },
  en_instance:    { label: 'En instance',   cls: 'bg-orange-100 text-orange-700' },
  retournee:      { label: 'Retournée',     cls: 'bg-gray-100 text-gray-600' },
  anomalie:       { label: 'Anomalie',      cls: 'bg-red-100 text-red-700' },
  annulee:        { label: 'Annulée',       cls: 'bg-gray-100 text-gray-500' },
}

export default function StatutBadge({ statut, size = 'sm' }: { statut: StatutDemande; size?: 'xs' | 'sm' }) {
  const { label, cls } = CONFIG[statut] ?? { label: statut, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${cls} ${size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}>
      {label}
    </span>
  )
}
