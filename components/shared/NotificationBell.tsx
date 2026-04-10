'use client'

import Link from 'next/link'
import { useNotificationsStore } from '@/lib/stores/notifications.store'

interface Props {
  initialCount: number
  href?:        string
}

export default function NotificationBell({ initialCount, href = '/notifications' }: Props) {
  const storeCount = useNotificationsStore((s) => s.unreadCount)
  // Utilise le store si hydraté, sinon la valeur serveur
  const count = storeCount > 0 ? storeCount : initialCount

  return (
    <Link href={href} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
      <svg
        className="w-5 h-5 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#E30613] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
