interface Step {
  number: number
  label: string
}

const STEPS: Step[] = [
  { number: 1, label: 'Adresse de collecte' },
  { number: 2, label: 'Composition des colis' },
  { number: 3, label: 'Récapitulatif' },
]

export default function StepperHeader({ current }: { current: number }) {
  return (
    <nav aria-label="Étapes du formulaire" className="mb-6 md:mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const done = current > step.number
          const active = current === step.number

          return (
            <li key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Cercle + label */}
              <div className="flex flex-col items-center gap-1.5 min-w-[56px] sm:min-w-[80px]">
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    done
                      ? 'bg-[#CC0000] border-[#CC0000] text-white'
                      : active
                      ? 'bg-white border-[#CC0000] text-[#CC0000]'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {done ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                {/* Label caché sur très petits écrans */}
                <span
                  className={`hidden sm:block text-xs font-medium text-center leading-tight ${
                    active ? 'text-[#CC0000]' : done ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                {/* Sur mobile : juste le numéro d'étape si actif */}
                {active && (
                  <span className="sm:hidden text-[10px] font-medium text-[#CC0000] text-center leading-tight max-w-[56px] truncate">
                    {step.label}
                  </span>
                )}
              </div>

              {/* Connecteur */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 sm:mx-2 mb-3 sm:mb-5 transition-colors ${
                    done ? 'bg-[#CC0000]' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
