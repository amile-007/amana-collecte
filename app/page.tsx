export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Redirige chaque rôle vers son portail dès la racine.
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  switch (profile?.role) {
    case 'client':      redirect('/dashboard')
    case 'chef_centre': redirect('/backoffice')
    case 'admin':       redirect('/admin')
    case 'collecteur':  redirect('/dashboard')
    default:            redirect('/login')
  }
}
