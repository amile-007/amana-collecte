'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/collecteur/missions',
    label: 'Missions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" />
      </svg>
    ),
  },
  {
    href: '/collecteur/carte',
    label: 'Carte',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: '/collecteur/profil',
    label: 'Profil',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

interface Props {
  children: React.ReactNode
  prenom: string
  nom: string
  missionCount: number
}

export default function CollecteurShell({ children, prenom, nom, missionCount }: Props) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[#E30613] font-black text-lg tracking-tight">AMANA</span>
            <span className="text-gray-300 text-sm">|</span>
            <span className="text-gray-500 text-xs">Collecte</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{prenom} {nom}</span>
            {missionCount > 0 && (
              <span className="bg-[#E30613] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {missionCount}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 flex justify-center">
          <div className="w-full max-w-[430px] flex h-16">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                    active ? 'text-[#E30613]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className={active ? 'text-[#E30613]' : 'text-gray-400'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </nav>

      </div>
    </div>
  )
}
