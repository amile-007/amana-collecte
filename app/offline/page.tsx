'use client'

import Image from 'next/image'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
      <Image
        src="/images/amana-logo.svg"
        alt="AMANA Collecte"
        width={140}
        height={40}
        className="mb-10"
      />

      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 3l18 18M9.172 9.172A4 4 0 005 13H3m4-4a7.971 7.971 0 013.172-1.9M12 12H3m9 0a9 9 0 010-18 9.015 9.015 0 018.975 8.4M21 12c0 .342-.018.68-.052 1.013" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-2">Vous êtes hors connexion</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-8">
        Vérifiez votre connexion internet et réessayez.
        Certaines pages consultées récemment restent accessibles.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-[#E30613] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#c00510] transition-colors text-sm"
      >
        Réessayer
      </button>
    </div>
  )
}
