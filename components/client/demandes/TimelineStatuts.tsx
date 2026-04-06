import type { StatutHistorique } from '@/lib/types'

const ACTEUR_LABEL: Record<string, string> = {
  client: 'Vous',
  collecteur: 'Collecteur',
  chef_centre: 'Chef de centre',
  admin: 'Administrateur',
  system: 'Système',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-MA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function TimelineStatuts({ historique }: { historique: StatutHistorique[] }) {
  if (!historique.length) {
    return <p className="text-sm text-gray-400 italic">Aucun historique disponible.</p>
  }

  return (
    <ol className="relative flex flex-col gap-0 border-l border-gray-200 ml-3">
      {historique.map((entry, i) => (
        <li key={entry.id} className="relative pl-6 pb-6 last:pb-0">
          {/* Dot */}
          <span
            className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center ${i === 0 ? 'bg-[#CC0000]' : 'bg-gray-300'}`}
          >
            {i === 0 && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {entry.statut_apres.replace(/_/g, ' ')}
              </span>
              {entry.acteur_role && (
                <span className="text-xs text-gray-400">
                  par {ACTEUR_LABEL[entry.acteur_role] ?? entry.acteur_role}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{formatDate(entry.created_at)}</span>
            {entry.commentaire && (
              <p className="text-xs text-gray-600 mt-1 italic">{entry.commentaire}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
