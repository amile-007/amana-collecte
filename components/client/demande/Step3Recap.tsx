'use client'

import { useState, useTransition, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { ColisItemData } from './ColisFormItem'
import type { Step1Data } from './Step1Adresse'
import {
  calculerPoidsVolumetrique,
  calculerPoidsReference,
  calculerTarif,
} from '@/lib/utils/tarification'
import { createDemande, type DemandeCreee } from '@/lib/actions/demande'
import Button from '@/components/ui/Button'

interface Step3Props {
  step1: Step1Data
  colis: ColisItemData[]
  onBack: () => void
}

export default function Step3Recap({ step1, colis, onBack }: Step3Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<DemandeCreee | null>(null)
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const colisCalculés = colis.map((c) => {
    const p = parseFloat(c.poids_declare) || 0
    const l = parseFloat(c.longueur) || 0
    const larg = parseFloat(c.largeur) || 0
    const h = parseFloat(c.hauteur) || 0
    const poidsVol = calculerPoidsVolumetrique(l, larg, h)
    const poidsRef = calculerPoidsReference(p, poidsVol)
    const tarif = calculerTarif(step1.villeCollecte, c.destination_ville, poidsRef)
    return { ...c, poidsVol, poidsRef, tarif }
  })

  const totalTarif = colisCalculés.reduce((s, c) => s + c.tarif, 0)
  const totalCrbt = colisCalculés.reduce((s, c) => s + (parseFloat(c.crbt_montant) || 0), 0)

  const handleValider = () => {
    setError('')
    startTransition(async () => {
      try {
        const res = await createDemande({
          adresse_collecte_texte: step1.adresseTexte,
          adresse_collecte_lat: step1.lat,
          adresse_collecte_lng: step1.lng,
          ville_collecte: step1.villeCollecte,
          type_variante: colisCalculés.every((c) => c.destination_ville === step1.villeCollecte) ? 'intra_ville' : 'inter_ville',
          notes: '',
          colis: colisCalculés.map((c) => ({
            destination_ville: c.destination_ville,
            destinataire_nom: c.destinataire_nom,
            destinataire_telephone: c.destinataire_telephone,
            destinataire_adresse: c.destinataire_adresse,
            destinataire_lat: c.destinataire_lat ?? null,
            destinataire_lng: c.destinataire_lng ?? null,
            poids_declare: parseFloat(c.poids_declare) || 0,
            longueur: parseFloat(c.longueur) || 0,
            largeur: parseFloat(c.largeur) || 0,
            hauteur: parseFloat(c.hauteur) || 0,
            tarif_unitaire: c.tarif,
            crbt_montant: parseFloat(c.crbt_montant) || null,
          })),
        })
        setResult(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la création de la demande.')
      }
    })
  }

  const handlePrint = () => window.print()

  // ─── Écran de confirmation avec QR codes ─────────────────────────────────
  if (result) {
    return (
      <div className="flex flex-col gap-6" ref={printRef}>
        {/* Succès */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Demande créée avec succès !</p>
            <p className="text-xs text-green-600 mt-0.5">Référence : <strong>{result.reference}</strong></p>
            <p className="text-xs text-green-600">Un collecteur sera affecté prochainement.</p>
          </div>
        </div>

        {/* QR codes par colis */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-900">Étiquettes colis — à imprimer</h3>
          {result.colisCreés.map((c) => (
            <div
              key={c.reference}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-5"
            >
              <QRCodeSVG
                value={JSON.stringify({ ref: c.reference, demande: result.reference })}
                size={100}
                level="M"
                includeMargin
              />
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Référence colis</p>
                <p className="text-base font-bold text-gray-900 font-mono">{c.reference}</p>
                <p className="text-sm text-gray-600">{c.destinataire_nom}</p>
                <p className="text-xs text-gray-500">{c.destination_ville}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer les étiquettes
          </button>
          <a
            href="/mes-demandes"
            className="flex-1 flex items-center justify-center rounded-xl bg-[#CC0000] text-white text-sm font-semibold hover:bg-[#aa0000] transition-colors"
          >
            Voir mes demandes
          </a>
        </div>
      </div>
    )
  }

  // ─── Récapitulatif avant validation ──────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Adresse collecte */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Adresse de collecte</h3>
        <div className="flex items-start gap-3">
          <div className="h-6 w-6 rounded-full bg-[#CC0000] flex items-center justify-center shrink-0 mt-0.5">
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{step1.villeCollecte}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step1.adresseTexte}</p>
          </div>
        </div>
      </section>

      {/* Liste colis */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {colis.length} colis
        </h3>
        <div className="flex flex-col divide-y divide-gray-100">
          {colisCalculés.map((c, i) => (
            <div key={c._id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-start gap-4">
              <div className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.destinataire_nom}</p>
                  <p className="text-xs text-gray-500">{c.destination_ville} · {c.destinataire_telephone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.poids_declare}kg réel · {c.poidsVol.toFixed(3)}kg vol. · <strong className="text-gray-600">{c.poidsRef.toFixed(3)}kg réf.</strong>
                  </p>
                  {parseFloat(c.crbt_montant) > 0 && (
                    <p className="text-xs text-orange-600 mt-0.5">CRBT : {c.crbt_montant} MAD</p>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900 shrink-0">{c.tarif} MAD</p>
            </div>
          ))}
        </div>
      </section>

      {/* Totaux */}
      <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Transport ({colis.length} colis)</span>
          <span className="font-semibold">{totalTarif} MAD</span>
        </div>
        {totalCrbt > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Total CRBT à encaisser</span>
            <span className="font-semibold">{totalCrbt} MAD</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 border-t border-red-200 pt-2 mt-1">
          <span>Total à payer</span>
          <span className="text-[#CC0000]">{totalTarif} MAD</span>
        </div>
        <p className="text-xs text-gray-400">Paiement en espèces au collecteur</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ← Retour
        </button>
        <Button onClick={handleValider} fullWidth loading={isPending} className="flex-1">
          {isPending ? 'Création en cours...' : 'Confirmer la demande'}
        </Button>
      </div>
    </div>
  )
}
