import { createClient } from '@/lib/supabase/server'
import CarteCollecteurWrapper from '@/components/collecteur/CarteCollecteurWrapper'

export const dynamic = 'force-dynamic'

export default async function CartePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: demandes } = await supabase
    .from('demandes')
    .select('id, reference, adresse_collecte_texte, adresse_collecte_lat, adresse_collecte_lng, statut')
    .eq('collecteur_id', user!.id)
    .in('statut', ['affectee', 'en_cours', 'collectee', 'anomalie'])
    .not('adresse_collecte_lat', 'is', null)

  const missions = (demandes ?? [])
    .filter((d) => d.adresse_collecte_lat != null && d.adresse_collecte_lng != null)
    .map((d) => ({
      id: d.id,
      reference: d.reference,
      adresse: d.adresse_collecte_texte,
      statut: d.statut,
      lat: d.adresse_collecte_lat as number,
      lng: d.adresse_collecte_lng as number,
    }))

  return (
    <div className="h-[calc(100vh-3.5rem-4rem)]">
      <CarteCollecteurWrapper missions={missions} />
    </div>
  )
}
