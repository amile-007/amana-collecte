import { createClient } from '@/lib/supabase/server'
import AuditLogAdmin from '@/components/admin/audit/AuditLogAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('audit_log')
    .select(`
      id,
      acteur_id,
      action,
      entite,
      entite_id,
      valeur_avant,
      valeur_apres,
      ip_address,
      created_at,
      acteur:profiles!audit_log_acteur_id_fkey(nom, prenom, role)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Journal d&apos;audit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Traçabilité des actions sensibles — 200 dernières entrées
        </p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AuditLogAdmin entries={(entries as any[]) ?? []} />
    </div>
  )
}
