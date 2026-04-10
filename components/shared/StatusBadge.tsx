import type { StatutDemande } from '@/lib/types'

const CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  en_attente:      { label: 'En attente',     bg: 'bg-gray-100',    text: 'text-gray-700',   dot: 'bg-gray-400' },
  affectee:        { label: 'Affectée',        bg: 'bg-blue-100',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  en_cours:        { label: 'En cours',        bg: 'bg-amber-100',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  collectee:       { label: 'Collectée',       bg: 'bg-teal-100',    text: 'text-teal-700',   dot: 'bg-teal-500' },
  en_transit:      { label: 'En transit',      bg: 'bg-purple-100',  text: 'text-purple-700', dot: 'bg-purple-500' },
  livree:          { label: 'Livrée',          bg: 'bg-green-100',   text: 'text-green-700',  dot: 'bg-green-500' },
  deposee_centre:  { label: 'Déposée centre',  bg: 'bg-indigo-100',  text: 'text-indigo-700', dot: 'bg-indigo-500' },
  en_instance:     { label: 'En instance',     bg: 'bg-orange-100',  text: 'text-orange-700', dot: 'bg-orange-500' },
  retournee:       { label: 'Retournée',       bg: 'bg-yellow-100',  text: 'text-yellow-700', dot: 'bg-yellow-500' },
  anomalie:        { label: 'Anomalie',        bg: 'bg-red-100',     text: 'text-red-700',    dot: 'bg-red-500' },
  annulee:         { label: 'Annulée',         bg: 'bg-gray-100',    text: 'text-gray-500',   dot: 'bg-gray-300' },
}

interface Props {
  statut: StatutDemande | string
  size?:  'sm' | 'md'
  dot?:   boolean
}

export default function StatusBadge({ statut, size = 'sm', dot = false }: Props) {
  const cfg = CONFIG[statut] ?? { label: statut, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }

  const padding = size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5'
  const fontSize = size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 ${padding} rounded-full font-semibold ${fontSize} ${cfg.bg} ${cfg.text}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />}
      {cfg.label}
    </span>
  )
}
