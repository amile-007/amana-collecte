'use client'

import { useState } from 'react'

interface PreuveLivraisonProps {
  signatureBase64: string | null
  photoBase64: string | null
  dateLivraison: string
  collecteurNom: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-MA', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PreuveLivraison({
  signatureBase64,
  photoBase64,
  dateLivraison,
  collecteurNom,
}: PreuveLivraisonProps) {
  const [lightbox, setLightbox] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      {/* Infos livraison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Date de livraison</p>
          <p className="text-sm font-semibold text-gray-900">{formatDate(dateLivraison)}</p>
        </div>
        <div className="bg-green-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Collecteur</p>
          <p className="text-sm font-semibold text-gray-900">{collecteurNom || '—'}</p>
        </div>
      </div>

      {/* Signature */}
      {signatureBase64 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signature du destinataire</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureBase64}
              alt="Signature du destinataire"
              className="w-full object-contain"
              style={{ maxHeight: 120 }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signature du destinataire</p>
          <p className="text-xs text-gray-400 italic">Non disponible</p>
        </div>
      )}

      {/* Photo */}
      {photoBase64 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo de livraison</p>
          <button
            onClick={() => setLightbox(true)}
            className="relative rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoBase64}
              alt="Photo de livraison"
              className="w-full object-cover"
              style={{ maxHeight: 200 }}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity">
              <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                Agrandir
              </span>
            </div>
          </button>
          <p className="text-xs text-gray-400">Cliquez pour afficher en plein écran</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo de livraison</p>
          <p className="text-xs text-gray-400 italic">Non disponible</p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && photoBase64 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoBase64}
            alt="Photo de livraison"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
