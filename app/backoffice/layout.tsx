import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/backoffice/Sidebar'
import { signOut } from '@/lib/actions/auth'

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, nom, prenom, centre_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'chef_centre') redirect('/')

  let centreNom = 'Centre'
  let centreVille = ''

  if (profile.centre_id) {
    const { data: centre } = await supabase
      .from('centres')
      .select('nom, ville')
      .eq('id', profile.centre_id)
      .single()
    if (centre) {
      centreNom = centre.nom
      centreVille = centre.ville
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar centreNom={centreNom} centreVille={centreVille} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{profile.prenom} {profile.nom}</span>
            <div className="h-8 w-8 rounded-full bg-[#CC0000] flex items-center justify-center text-white text-xs font-bold">
              {profile.prenom?.[0]}{profile.nom?.[0]}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
