import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/client/Sidebar'
import Header from '@/components/client/Header'
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

  // Guard rôle : seuls les clients accèdent à ce portail
  if (!profile || profile.role !== 'client') redirect('/')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('destinataire_id', user.id)
    .eq('lu', false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar unreadCount={unreadCount ?? 0} userId={user.id} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
