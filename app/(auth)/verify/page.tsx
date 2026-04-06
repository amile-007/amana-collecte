'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthError } from '@/lib/utils/auth-errors'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const type = (searchParams.get('type') ?? 'signup') as 'signup' | 'recovery'

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)
    setError('')
    if (digit && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...code]
    pasted.split('').forEach((digit, i) => { if (i < 6) next[i] = digit })
    setCode(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = code.join('')
    if (token.length < 6) { setError('Veuillez saisir les 6 chiffres du code.'); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.verifyOtp({ email, token, type })
    if (authError) { setError(getAuthError(authError.message)); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  async function handleResend() {
    if (!email) return
    setResendSuccess(false)
    setResendLoading(true)
    const supabase = createClient()
    if (type === 'recovery') {
      await supabase.auth.resetPasswordForEmail(email)
    } else {
      await supabase.auth.resend({ type: 'signup', email })
    }
    setResendLoading(false)
    setResendSuccess(true)
    setCode(['', '', '', '', '', ''])
    inputs.current[0]?.focus()
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#CC0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Vérification</h1>
        <p className="mt-2 text-sm text-gray-500">
          Un code à 6 chiffres a été envoyé à{' '}
          <span className="font-medium text-gray-700">{email || 'votre email'}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6" noValidate>
        <div className="flex gap-3" onPaste={handlePaste} role="group" aria-label="Code de vérification à 6 chiffres">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Chiffre ${i + 1}`}
              className={`h-12 w-10 rounded-lg border text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors ${digit ? 'border-[#CC0000] bg-red-50 text-[#CC0000]' : 'border-gray-300 bg-white text-gray-900'} ${error ? 'border-red-400' : ''}`}
            />
          ))}
        </div>

        {error && (
          <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}
        {resendSuccess && (
          <div className="w-full rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center">
            Un nouveau code a été envoyé à votre adresse email.
          </div>
        )}

        <Button type="submit" fullWidth loading={loading}>Valider le code</Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Vous n&apos;avez pas reçu le code ?{' '}
          <button type="button" onClick={handleResend} disabled={resendLoading}
            className="font-medium text-[#CC0000] hover:underline disabled:opacity-50">
            {resendLoading ? 'Envoi...' : 'Renvoyer le code'}
          </button>
        </p>
      </div>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  )
}
