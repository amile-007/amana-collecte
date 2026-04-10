import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CollecteurShell from '@/components/collecteur/CollecteurShell'

export default async function CollecteurLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, nom, prenom')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'collecteur') redirect('/')

  const { count: missionCount } = await supabase
    .from('demandes')
    .select('*', { count: 'exact', head: true })
    .eq('collecteur_id', user.id)
    .in('statut', ['affectee', 'en_cours'])

  return (
    <CollecteurShell
      prenom={profile.prenom ?? ''}
      nom={profile.nom ?? ''}
      missionCount={missionCount ?? 0}
    >
      {children}
    </CollecteurShell>
  )
}
