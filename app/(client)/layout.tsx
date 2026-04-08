import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LayoutShell from '@/components/client/LayoutShell'
import type { Profile } from '@/lib/types'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, nom, prenom, telephone, centre_id, crbt_enabled, actif, created_at')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') redirect('/')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('destinataire_id', user.id)
    .eq('lu', false)

  return (
    <LayoutShell
      profile={profile as Profile}
      unreadCount={unreadCount ?? 0}
      userId={user.id}
    >
      {children}
    </LayoutShell>
  )
}
