'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

export default function NotificationsBadge({
  initialCount,
  userId,
}: {
  initialCount: number
  userId: string
}) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`badge:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `destinataire_id=eq.${userId}`,
        },
        () => setCount((c) => c + 1)
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
          const n = payload.new as Notification
          // Si marquée comme lue, décrémente
          if (n.lu) setCount((c) => Math.max(0, c - 1))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  if (count === 0) return null

  return (
    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#CC0000] text-[9px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}
