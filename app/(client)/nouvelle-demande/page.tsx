'use client'

import { useState } from 'react'
import StepperHeader from '@/components/client/demande/StepperHeader'
import Step1Adresse, { type Step1Data } from '@/components/client/demande/Step1Adresse'
import Step2Colis from '@/components/client/demande/Step2Colis'
import Step3Recap from '@/components/client/demande/Step3Recap'
import { defaultColis, type ColisItemData } from '@/components/client/demande/ColisFormItem'

const INIT_STEP1: Step1Data = {
  villeCollecte: 'Casablanca',
  adresseTexte: '',
  lat: null,
  lng: null,
}

export default function NouvelleDemandePage() {
  const [step, setStep] = useState(1)
  const [step1, setStep1] = useState<Step1Data>(INIT_STEP1)
  const [colis, setColis] = useState<ColisItemData[]>([defaultColis()])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande</h1>
        <p className="mt-1 text-sm text-gray-500">
          Planifiez la collecte de vos colis en quelques étapes
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <StepperHeader current={step} />

        {step === 1 && (
          <Step1Adresse
            data={step1}
            onChange={setStep1}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2Colis
            colis={colis}
            villeCollecte={step1.villeCollecte}
            onChange={setColis}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3Recap
            step1={step1}
            colis={colis}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}
