// Historique des statuts d'une demande — partagé client/backoffice/collecteur

interface HistoryEntry {
  id:           string
  statut_avant: string | null
  statut_apres: string
  commentaire:  string | null
  created_at:   string
  acteur?: {
    nom:    string | null
    prenom: string | null
    role:   string | null
  } | null
}

const ROLE_LABEL: Record<string, string> = {
  client:      'Client',
  collecteur:  'Collecteur',
  chef_centre: 'Chef de centre',
  admin:       'Admin',
  system:      'Système',
}

const STATUT_LABEL: Record<string, string> = {
  en_attente:     'En attente',
  affectee:       'Affectée',
  en_cours:       'En cours',
  collectee:      'Collectée',
  en_transit:     'En transit',
  livree:         'Livrée',
  deposee_centre: 'Déposée centre',
  en_instance:    'En instance',
  retournee:      'Retournée',
  anomalie:       'Anomalie',
  annulee:        'Annulée',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

interface Props {
  entries: HistoryEntry[]
}

export default function Timeline({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 italic">Aucun historique disponible.</p>
  }

  return (
    <ol className="relative border-l border-gray-200 flex flex-col gap-0">
      {entries.map((entry, i) => (
        <li key={entry.id} className="ml-4 pb-5 last:pb-0">
          {/* Dot */}
          <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white ${
            i === 0 ? 'bg-[#E30613]' : 'bg-gray-300'
          }`} />

          {/* Content */}
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-gray-900">
              {STATUT_LABEL[entry.statut_apres] ?? entry.statut_apres}
            </p>

            <p className="text-xs text-gray-500">
              {formatDate(entry.created_at)}
              {entry.acteur && (
                <> · {entry.acteur.prenom} {entry.acteur.nom} ({ROLE_LABEL[entry.acteur.role ?? ''] ?? entry.acteur.role})</>
              )}
            </p>

            {entry.commentaire && (
              <p className="text-xs text-gray-500 italic mt-0.5">{entry.commentaire}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
