import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single() as { data: Profile | null }

  if (!profile) return null

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="mt-1 text-sm text-gray-500">Informations de votre compte</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[#CC0000] flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {profile.prenom?.[0]}{profile.nom?.[0]}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{profile.prenom} {profile.nom}</p>
            <p className="text-sm text-gray-500">{user!.email}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Téléphone</dt>
            <dd className="mt-1 text-gray-900 font-medium">{profile.telephone || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Rôle</dt>
            <dd className="mt-1 text-gray-900 font-medium capitalize">{profile.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Compte créé le</dt>
            <dd className="mt-1 text-gray-900 font-medium">
              {new Date(profile.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Statut</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${profile.actif ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${profile.actif ? 'bg-green-500' : 'bg-gray-400'}`} />
                {profile.actif ? 'Actif' : 'Inactif'}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
