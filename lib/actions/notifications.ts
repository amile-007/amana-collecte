'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('notifications').update({ lu: true }).eq('id', id)
  revalidatePath('/notifications')
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ lu: true })
    .eq('destinataire_id', user.id)
    .eq('lu', false)
  revalidatePath('/notifications')
}
