import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LayoutShellBO from '@/components/backoffice/LayoutShellBO'

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
    <LayoutShellBO
      centreNom={centreNom}
      centreVille={centreVille}
      prenom={profile.prenom ?? ''}
      nom={profile.nom ?? ''}
    >
      {children}
    </LayoutShellBO>
  )
}
