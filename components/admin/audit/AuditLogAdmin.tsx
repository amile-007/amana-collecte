'use client'

import { useState } from 'react'

interface AuditEntry {
  id: string
  acteur_id: string | null
  action: string
  entite: string
  entite_id: string | null
  valeur_avant: Record<string, unknown> | null
  valeur_apres: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  acteur?: { nom: string; prenom: string; role: string } | null
}

interface AuditLogAdminProps {
  entries: AuditEntry[]
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
}

export default function AuditLogAdmin({ entries }: AuditLogAdminProps) {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    const matchQ = !q || e.action.toLowerCase().includes(q) || e.entite.toLowerCase().includes(q)
    const matchA = !actionFilter || e.action === actionFilter
    return matchQ && matchA
  })

  const actions = [...new Set(entries.map((e) => e.action))]

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Rechercher action, entité…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30 w-full max-w-xs"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
        >
          <option value="">Toutes les actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">
          {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Entrées */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-400 italic">Aucune entrée dans le journal d&apos;audit</p>
            <p className="text-xs text-gray-300 mt-1">
              Les actions sensibles seront tracées ici dès qu&apos;elles seront enregistrées.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((e) => (
              <div key={e.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${
                      ACTION_COLORS[e.action] ?? 'bg-gray-50 text-gray-700'
                    }`}>
                      {e.action}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {e.entite}
                        {e.entite_id && (
                          <span className="ml-2 text-xs text-gray-400 font-mono">
                            {e.entite_id.slice(0, 8)}…
                          </span>
                        )}
                      </p>
                      {e.acteur && (
                        <p className="text-xs text-gray-500">
                          Par {e.acteur.prenom} {e.acteur.nom}
                          {' · '}<span className="text-gray-400">{e.acteur.role}</span>
                        </p>
                      )}
                      {e.ip_address && (
                        <p className="text-xs text-gray-400 font-mono">{e.ip_address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleString('fr-MA', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {(e.valeur_avant || e.valeur_apres) && (
                      <button
                        onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                        className="text-xs text-[#CC0000] hover:underline"
                      >
                        {expanded === e.id ? 'Masquer' : 'Détails'}
                      </button>
                    )}
                  </div>
                </div>

                {expanded === e.id && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {e.valeur_avant && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Avant</p>
                        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-40">
                          {JSON.stringify(e.valeur_avant, null, 2)}
                        </pre>
                      </div>
                    )}
                    {e.valeur_apres && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Après</p>
                        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-40">
                          {JSON.stringify(e.valeur_apres, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
