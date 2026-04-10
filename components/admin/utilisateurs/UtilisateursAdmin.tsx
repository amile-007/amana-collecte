'use client'

import { useState, useTransition } from 'react'
import { toggleUtilisateurActif, changerRole } from '@/lib/actions/admin'
import type { Profile, Role } from '@/lib/types'

const ROLE_LABELS: Record<Role, string> = {
  client:       'Client',
  collecteur:   'Collecteur',
  chef_centre:  'Chef de centre',
  admin:        'Administrateur',
  superviseur:  'Superviseur',
}

const ROLE_COLORS: Record<Role, string> = {
  client:      'bg-blue-50 text-blue-700',
  collecteur:  'bg-green-50 text-green-700',
  chef_centre: 'bg-purple-50 text-purple-700',
  admin:       'bg-red-50 text-red-700',
  superviseur: 'bg-gray-50 text-gray-700',
}

const ROLES: Role[] = ['client', 'collecteur', 'chef_centre', 'admin', 'superviseur']

export default function UtilisateursAdmin({ utilisateurs }: { utilisateurs: Profile[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filtered = utilisateurs.filter((u) => {
    const q = search.toLowerCase()
    const matchQ = !q || `${u.prenom} ${u.nom} ${u.telephone}`.toLowerCase().includes(q)
    const matchR = !roleFilter || u.role === roleFilter
    return matchQ && matchR
  })

  const handleToggleActif = (u: Profile) => {
    setPendingId(u.id)
    startTransition(async () => {
      await toggleUtilisateurActif(u.id, !u.actif)
      setPendingId(null)
    })
  }

  const handleRole = (u: Profile, role: Role) => {
    setPendingId(u.id)
    startTransition(async () => {
      await changerRole(u.id, role)
      setPendingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Rechercher par nom, téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30 w-full max-w-xs"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Téléphone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscrit le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className={u.actif ? '' : 'opacity-60 bg-gray-50'}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.prenom} {u.nom}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.telephone}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={pendingId === u.id}
                      onChange={(e) => handleRole(u, e.target.value as Role)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${ROLE_COLORS[u.role]} focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30 cursor-pointer disabled:opacity-50`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.actif ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('fr-MA')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActif(u)}
                      disabled={pendingId === u.id}
                      className={`text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.actif
                          ? 'text-red-500 hover:text-red-700'
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {pendingId === u.id ? '…' : u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400 italic">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
