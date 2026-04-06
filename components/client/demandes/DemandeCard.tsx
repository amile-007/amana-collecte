import Link from 'next/link'
import StatutBadge from './StatutBadge'
import type { StatutDemande } from '@/lib/types'

interface DemandeCardProps {
  id: string
  reference: string
  statut: StatutDemande
  createdAt: string
  nombreColis: number
  montantTotal: number | null
  adresseCollecte: string
}

export default function DemandeCard({
  id, reference, statut, createdAt, nombreColis, montantTotal, adresseCollecte,
}: DemandeCardProps) {
  const date = new Date(createdAt).toLocaleDateString('fr-MA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const heure = new Date(createdAt).toLocaleTimeString('fr-MA', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex flex-col gap-2 min-w-0">
        {/* Référence + statut */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-sm font-bold text-gray-900">{reference}</span>
          <StatutBadge statut={statut} />
        </div>

        {/* Adresse tronquée */}
        <p className="text-xs text-gray-500 truncate max-w-xs">{adresseCollecte}</p>

        {/* Méta */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{date} à {heure}</span>
          <span>·</span>
          <span>{nombreColis} colis</span>
          {montantTotal !== null && (
            <>
              <span>·</span>
              <span className="font-semibold text-gray-600">{montantTotal} MAD</span>
            </>
          )}
        </div>
      </div>

      <Link
        href={`/mes-demandes/${id}`}
        className="shrink-0 text-xs font-medium text-[#CC0000] hover:underline whitespace-nowrap"
      >
        Voir détail →
      </Link>
    </div>
  )
}
