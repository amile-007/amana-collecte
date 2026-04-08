'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthError } from '@/lib/utils/auth-errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

interface FormErrors {
  prenom?: string
  nom?: string
  telephone?: string
  email?: string
  password?: string
  confirm?: string
}

function validate(fields: {
  prenom: string
  nom: string
  email: string
  password: string
  confirm: string
}): FormErrors {
  const errors: FormErrors = {}
  if (!fields.prenom.trim()) errors.prenom = 'Le prénom est requis.'
  if (!fields.nom.trim()) errors.nom = 'Le nom est requis.'
  if (!fields.email.trim()) {
    errors.email = "L'adresse email est requise."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "L'adresse email n'est pas valide."
  }
  if (!fields.password) {
    errors.password = 'Le mot de passe est requis.'
  } else if (fields.password.length < 8) {
    errors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
  }
  if (!fields.confirm) {
    errors.confirm = 'Veuillez confirmer votre mot de passe.'
  } else if (fields.password !== fields.confirm) {
    errors.confirm = 'Les mots de passe ne correspondent pas.'
  }
  return errors
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', email: '', password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const errors = validate(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          telephone: form.telephone.trim(),
          role: 'client',
        },
      },
    })
    if (authError) {
      setServerError(getAuthError(authError.message))
      setLoading(false)
      return
    }
    router.push(`/verify?email=${encodeURIComponent(form.email.trim())}&type=signup`)
  }

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p className="mt-1 text-sm text-gray-500">Rejoignez AMANA Collecte en quelques secondes</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Prénom" name="prenom" type="text" placeholder="Youssef"
            value={form.prenom} onChange={handleChange} error={fieldErrors.prenom} autoComplete="given-name" />
          <Input label="Nom" name="nom" type="text" placeholder="Benali"
            value={form.nom} onChange={handleChange} error={fieldErrors.nom} autoComplete="family-name" />
        </div>
        <Input label="Téléphone" name="telephone" type="tel" placeholder="+212 6 00 00 00 00"
          value={form.telephone} onChange={handleChange} error={fieldErrors.telephone} autoComplete="tel" />
        <Input label="Adresse email" name="email" type="email" placeholder="exemple@email.com"
          value={form.email} onChange={handleChange} error={fieldErrors.email} autoComplete="email" />
        <Input label="Mot de passe" name="password" type="password" placeholder="Au moins 8 caractères"
          value={form.password} onChange={handleChange} error={fieldErrors.password} autoComplete="new-password" />
        <Input label="Confirmer le mot de passe" name="confirm" type="password" placeholder="Répétez votre mot de passe"
          value={form.confirm} onChange={handleChange} error={fieldErrors.confirm} autoComplete="new-password" />

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} className="mt-2">
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-[#CC0000] hover:underline">
          Se connecter
        </Link>
      </p>
    </Card>
  )
}
