import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import StatutSelector from '@/components/collecteur/StatutSelector'

export const dynamic = 'force-dynamic'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom, prenom, telephone, centre_id')
    .eq('id', user!.id)
    .single()

  const { data: collecteur } = await supabase
    .from('collecteurs')
    .select('statut, zone_intervention, capacite_max_kg')
    .eq('id', user!.id)
    .single()

  let centreNom = '—'
  if (profile?.centre_id) {
    const { data: centre } = await supabase
      .from('centres')
      .select('nom, ville')
      .eq('id', profile.centre_id)
      .single()
    if (centre) centreNom = `${centre.nom} — ${centre.ville}`
  }

  const statut = (collecteur?.statut ?? 'disponible') as 'disponible' | 'en_mission' | 'indisponible'

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* Avatar + identité */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-[#E30613] rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-xl font-bold">
            {(profile?.prenom?.[0] ?? '?').toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{profile?.prenom} {profile?.nom}</p>
          <p className="text-sm text-gray-500 mt-0.5">{profile?.telephone}</p>
          <p className="text-xs text-gray-400 mt-0.5">{centreNom}</p>
        </div>
      </div>

      {/* Infos collecteur */}
      {collecteur && (collecteur.zone_intervention || collecteur.capacite_max_kg) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informations</p>
          <div className="flex flex-col gap-2 text-sm">
            {collecteur.zone_intervention && (
              <div className="flex justify-between">
                <span className="text-gray-500">Zone</span>
                <span className="text-gray-900 font-medium">{collecteur.zone_intervention}</span>
              </div>
            )}
            {collecteur.capacite_max_kg && (
              <div className="flex justify-between">
                <span className="text-gray-500">Capacité max</span>
                <span className="text-gray-900 font-medium">{collecteur.capacite_max_kg} kg</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statut selector */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <StatutSelector current={statut} />
      </div>

      {/* Déconnexion */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full bg-white border border-gray-200 text-gray-600 text-sm font-medium py-3 rounded-xl flex items-center justify-center gap-2 active:opacity-70"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
      </form>
    </div>
  )
}
