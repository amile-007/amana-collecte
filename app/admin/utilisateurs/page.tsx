import { createClient } from '@/lib/supabase/server'
import UtilisateursAdmin from '@/components/admin/utilisateurs/UtilisateursAdmin'
import type { Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminUtilisateursPage() {
  const supabase = await createClient()

  const { data: utilisateurs } = await supabase
    .from('profiles')
    .select('id, role, nom, prenom, telephone, centre_id, actif, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestion des comptes — {utilisateurs?.length ?? 0} utilisateur{(utilisateurs?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>
      <UtilisateursAdmin utilisateurs={(utilisateurs as Profile[]) ?? []} />
    </div>
  )
}
