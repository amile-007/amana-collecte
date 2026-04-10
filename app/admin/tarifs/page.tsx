import { createClient } from '@/lib/supabase/server'
import TarifsAdmin from '@/components/admin/tarifs/TarifsAdmin'
import type { BaremeTarifaire } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminTarifsPage() {
  const supabase = await createClient()

  const { data: baremes } = await supabase
    .from('baremes_tarifaires')
    .select('id, ville_origine, ville_destination, poids_min_kg, poids_max_kg, tarif_ht, actif, version')
    .order('ville_origine')
    .order('ville_destination')
    .order('poids_min_kg')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Barèmes tarifaires</h1>
        <p className="text-sm text-gray-500 mt-1">
          Grille de tarification par tranche de poids et zone géographique
        </p>
      </div>
      <TarifsAdmin baremes={(baremes as BaremeTarifaire[]) ?? []} />
    </div>
  )
}
