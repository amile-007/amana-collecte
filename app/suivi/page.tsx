'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SuiviPage() {
  const router = useRouter()
  const [ref, setRef] = useState('')
  const [error, setError] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = ref.trim().toUpperCase()
    if (!trimmed) { setError('Veuillez saisir une référence.'); return }
    if (!trimmed.startsWith('AMD-')) { setError('Format invalide. Exemple : AMD-20260412-0001'); return }
    router.push(`/suivi/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Image src="/images/amana-logo.svg" alt="AMANA" width={120} height={32} />
        <span className="text-sm text-gray-400 hidden sm:inline">· Suivi de colis</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="h-14 w-14 rounded-full bg-[#E30613] flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Suivre votre colis</h1>
              <p className="text-sm text-gray-500 mt-1">Entrez votre référence de demande</p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => { setRef(e.target.value); setError('') }}
                  placeholder="AMD-20260412-0001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#E30613]/30 focus:border-[#E30613]"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-[#E30613] text-white font-semibold py-3 rounded-xl hover:bg-[#c00510] transition-colors text-sm"
              >
                Rechercher
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6">
              La référence est au format <span className="font-mono">AMD-YYYYMMDD-XXXX</span>
            </p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Vous êtes client AMANA ?{' '}
            <a href="/login" className="text-[#E30613] hover:underline font-medium">
              Connectez-vous
            </a>{' '}
            pour plus de détails.
          </p>
        </div>
      </main>
    </div>
  )
}
