import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsRealtimeList from '@/components/client/notifications/NotificationsRealtimeList'
import type { Notification } from '@/lib/types'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('destinataire_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifs: Notification[] = data ?? []

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">Toutes les mises à jour de vos demandes</p>
      </div>
      <NotificationsRealtimeList initial={notifs} userId={user.id} />
    </div>
  )
}
