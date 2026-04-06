'use client'

import { useState, useTransition } from 'react'
import { annulerDemande } from '@/lib/actions/demande'

export default function AnnulerDemandeButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-gray-400 hover:text-red-600 underline transition-colors"
      >
        Annuler la demande
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="text-xs text-gray-600">Confirmer l&apos;annulation ?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirm(false)}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Non
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await annulerDemande(id)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Erreur')
              }
            })
          }
          className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? '…' : 'Oui, annuler'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
