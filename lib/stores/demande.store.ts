import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DemandeFormData, ColisFormData } from '@/lib/types'

const EMPTY_COLIS: ColisFormData = {
  destination_ville:      '',
  destinataire_nom:       '',
  destinataire_telephone: '',
  destinataire_adresse:   '',
  poids_declare:          '',
  longueur:               '',
  largeur:                '',
  hauteur:                '',
}

const INITIAL_FORM: DemandeFormData = {
  adresse_collecte_texte: '',
  adresse_collecte_lat:   null,
  adresse_collecte_lng:   null,
  type_variante:          'intra_ville',
  mode_paiement:          'especes',
  notes:                  '',
  colis:                  [{ ...EMPTY_COLIS }],
}

interface DemandeStore {
  step:     number
  formData: DemandeFormData

  setStep:        (step: number) => void
  nextStep:       () => void
  prevStep:       () => void
  updateFormData: (data: Partial<DemandeFormData>) => void
  addColis:       () => void
  removeColis:    (index: number) => void
  updateColis:    (index: number, data: Partial<ColisFormData>) => void
  reset:          () => void
}

export const useDemandeStore = create<DemandeStore>()(
  persist(
    (set, get) => ({
      step:     1,
      formData: INITIAL_FORM,

      setStep:  (step)   => set({ step }),
      nextStep: ()       => set((s) => ({ step: s.step + 1 })),
      prevStep: ()       => set((s) => ({ step: Math.max(1, s.step - 1) })),

      updateFormData: (data) =>
        set((s) => ({ formData: { ...s.formData, ...data } })),

      addColis: () =>
        set((s) => ({
          formData: {
            ...s.formData,
            colis: [...s.formData.colis, { ...EMPTY_COLIS }],
          },
        })),

      removeColis: (index) =>
        set((s) => ({
          formData: {
            ...s.formData,
            colis: s.formData.colis.filter((_, i) => i !== index),
          },
        })),

      updateColis: (index, data) =>
        set((s) => ({
          formData: {
            ...s.formData,
            colis: s.formData.colis.map((c, i) => i === index ? { ...c, ...data } : c),
          },
        })),

      reset: () => set({ step: 1, formData: INITIAL_FORM }),
    }),
    {
      name:    'amana-demande-form', // clé localStorage
      version: 1,
      // Ne persiste que le formulaire, pas le step
      partialize: (state) => ({ formData: state.formData }),
    }
  )
)
