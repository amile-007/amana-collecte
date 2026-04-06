'use client'

import { QRCodeSVG } from 'qrcode.react'
import type { Colis } from '@/lib/types'

export default function ColisQRCard({ colis, demandeRef }: { colis: Colis; demandeRef: string }) {
  return (
    <div className="flex items-center gap-5 bg-white border border-gray-200 rounded-xl p-4">
      <div className="shrink-0 bg-gray-50 p-2 rounded-lg border border-gray-100">
        <QRCodeSVG
          value={JSON.stringify({ ref: colis.reference, demande: demandeRef })}
          size={80}
          level="M"
        />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-mono text-xs font-bold text-gray-900">{colis.reference}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{colis.destinataire_nom}</p>
        <p className="text-xs text-gray-500 truncate">{colis.destination_ville} — {colis.destinataire_adresse}</p>
        <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
          <span>{colis.poids_declare} kg déclaré</span>
          <span>·</span>
          <span>{colis.poids_volumetrique?.toFixed(3)} kg vol.</span>
          {colis.tarif_unitaire != null && (
            <>
              <span>·</span>
              <span className="font-semibold text-gray-600">{colis.tarif_unitaire} MAD</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
