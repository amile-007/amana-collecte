'use client'

import ColisFormItem, { ColisItemData, defaultColis } from './ColisFormItem'
import type { VilleDemo } from '@/lib/utils/tarification'
import { calculerPoidsVolumetrique, calculerPoidsReference, calculerTarif } from '@/lib/utils/tarification'
import Button from '@/components/ui/Button'

interface Step2Props {
  colis: ColisItemData[]
  villeCollecte: VilleDemo
  onChange: (colis: ColisItemData[]) => void
  onBack: () => void
  onNext: () => void
}

export default function Step2Colis({ colis, villeCollecte, onChange, onBack, onNext }: Step2Props) {
  const updateColis = (index: number, data: ColisItemData) => {
    const next = [...colis]
    next[index] = data
    onChange(next)
  }

  const addColis = () => onChange([...colis, defaultColis()])

  const removeColis = (index: number) => {
    if (colis.length === 1) return
    onChange(colis.filter((_, i) => i !== index))
  }

  // Validation : chaque colis doit avoir au minimum destinataire + poids
  const isValid = colis.every(
    (c) =>
      c.destinataire_nom.trim() &&
      c.destinataire_telephone.trim() &&
      c.destinataire_adresse.trim() &&
      parseFloat(c.poids_declare) > 0
  )

  const totalTarif = colis.reduce((sum, c) => {
    const p = parseFloat(c.poids_declare) || 0
    const l = parseFloat(c.longueur) || 0
    const larg = parseFloat(c.largeur) || 0
    const h = parseFloat(c.hauteur) || 0
    const poidsVol = calculerPoidsVolumetrique(l, larg, h)
    const poidsRef = calculerPoidsReference(p, poidsVol)
    return sum + calculerTarif(villeCollecte, c.destination_ville, poidsRef)
  }, 0)

  return (
    <div className="flex flex-col gap-5">
      {colis.map((c, i) => (
        <ColisFormItem
          key={c._id}
          index={i}
          data={c}
          villeCollecte={villeCollecte}
          canDelete={colis.length > 1}
          onChange={(d) => updateColis(i, d)}
          onDelete={() => removeColis(i)}
        />
      ))}

      {/* Bouton ajouter */}
      <button
        type="button"
        onClick={addColis}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-[#CC0000] hover:text-[#CC0000] transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Ajouter un colis
      </button>

      {/* Total */}
      {totalTarif > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">{colis.length} colis · Collecte depuis {villeCollecte}</p>
            <p className="text-sm font-medium text-gray-700">Montant estimé total</p>
          </div>
          <p className="text-2xl font-bold text-[#CC0000]">{totalTarif} <span className="text-sm">MAD</span></p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        <Button onClick={onNext} fullWidth disabled={!isValid} className="flex-1">
          Continuer — Récapitulatif →
        </Button>
      </div>
    </div>
  )
}
