'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationItem from './NotificationItem'
import { markAllNotificationsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/types'

interface Props {
  initial: Notification[]
  userId: string
}

export default function NotificationsRealtimeList({ initial, userId }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>(initial)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `destinataire_id=eq.${userId}`,
        },
        (payload) => {
          setNotifs((prev) => [payload.new as Notification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `destinataire_id=eq.${userId}`,
        },
        (payload) => {
          setNotifs((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const unread = notifs.filter((n) => !n.lu).length

  const handleMarkAll = async () => {
    setIsPending(true)
    await markAllNotificationsRead()
    setNotifs((prev) => prev.map((n) => ({ ...n, lu: true })))
    setIsPending(false)
  }

  if (!notifs.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-2xl mb-2">🔔</p>
        <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barre actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {unread > 0 ? <><strong className="text-gray-900">{unread}</strong> non lue{unread > 1 ? 's' : ''}</> : 'Tout est lu'}
        </p>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="text-xs text-[#CC0000] hover:underline disabled:opacity-50"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {notifs.map((n) => (
          <NotificationItem key={n.id} notif={n} />
        ))}
      </div>
    </div>
  )
}
