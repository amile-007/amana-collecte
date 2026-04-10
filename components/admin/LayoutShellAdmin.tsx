'use client'

import { useState } from 'react'
import SidebarAdmin from './SidebarAdmin'
import { signOut } from '@/lib/actions/auth'

interface Props {
  prenom: string
  nom: string
  children: React.ReactNode
}

export default function LayoutShellAdmin({ prenom, nom, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

      <SidebarAdmin isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{prenom} {nom}</span>
            <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {prenom?.[0]}{nom?.[0]}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
