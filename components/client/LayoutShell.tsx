'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile
  unreadCount: number
  userId: string
  children: React.ReactNode
}

export default function LayoutShell({ profile, unreadCount, userId, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Ferme le drawer à chaque changement de route
  usePathname() // déclenche un re-render lors de la navigation

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar
        unreadCount={unreadCount}
        userId={userId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          profile={profile}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
