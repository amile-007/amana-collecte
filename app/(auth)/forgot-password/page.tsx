'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getAuthError } from '@/lib/utils/auth-errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setServerError('')
    if (!email.trim()) { setEmailError("L'adresse email est requise."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("L'adresse email n'est pas valide."); return }
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/verify?type=recovery&email=${encodeURIComponent(email.trim())}`,
    })
    if (authError) { setServerError(getAuthError(authError.message)); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <Card>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email envoyé</h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Un email de réinitialisation a été envoyé à{' '}
            <span className="font-medium text-gray-700">{email}</span>.
          </p>
          <p className="mt-2 text-xs text-gray-400">Le lien expire dans 24 heures. Pensez à vérifier vos spams.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-[#CC0000] hover:underline">
              Utiliser une autre adresse email
            </button>
            <Link href="/login" className="text-sm text-gray-500 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#CC0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-gray-500">Saisissez votre email pour recevoir un lien de réinitialisation.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Adresse email"
          type="email"
          placeholder="exemple@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
          error={emailError}
          autoComplete="email"
        />
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}
        <Button type="submit" fullWidth loading={loading} className="mt-2">
          Envoyer le lien de réinitialisation
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-[#CC0000] hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </Card>
  )
}
