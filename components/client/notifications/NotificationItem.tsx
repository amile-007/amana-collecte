'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { markNotificationRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/types'

const EVENT_ICON: Record<string, string> = {
  demande_creee:   '📦',
  demande_affectee:'🚴',
  en_cours:        '📍',
  collectee:       '✅',
  anomalie:        '⚠️',
  livree:          '🎉',
  depot_valide:    '🏢',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })
}

export default function NotificationItem({ notif }: { notif: Notification }) {
  const [isPending, startTransition] = useTransition()

  const handleRead = () => {
    if (!notif.lu) {
      startTransition(() => markNotificationRead(notif.id))
    }
  }

  const content = (
    <div
      onClick={handleRead}
      className={`flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer ${
        notif.lu ? 'bg-white hover:bg-gray-50' : 'bg-red-50 hover:bg-red-100/60'
      } ${isPending ? 'opacity-50' : ''}`}
    >
      {/* Icône */}
      <div className="text-xl shrink-0 mt-0.5" role="img" aria-label={notif.type_evenement}>
        {EVENT_ICON[notif.type_evenement] ?? '🔔'}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${notif.lu ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
            {notif.titre}
          </p>
          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{formatDate(notif.created_at)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
      </div>

      {/* Point non lu */}
      {!notif.lu && (
        <span className="h-2 w-2 rounded-full bg-[#CC0000] shrink-0 mt-1.5" />
      )}
    </div>
  )

  if (notif.demande_id) {
    return <Link href={`/mes-demandes/${notif.demande_id}`} className="block">{content}</Link>
  }
  return content
}
