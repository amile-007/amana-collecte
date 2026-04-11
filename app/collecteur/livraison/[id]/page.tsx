import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LivraisonForm from '@/components/collecteur/LivraisonForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LivraisonPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: demande } = await supabase
    .from('demandes')
    .select('id, reference, statut, type_variante, collecteur_id, colis(id, destinataire_nom)')
    .eq('id', id)
    .eq('collecteur_id', user.id)
    .single()

  if (!demande) notFound()

  // Seules les demandes intra-ville collectées peuvent être livrées ici
  if (demande.statut !== 'collectee' || demande.type_variante !== 'intra_ville') {
    redirect('/collecteur/missions')
  }

  const colis = Array.isArray(demande.colis) ? demande.colis : []
  const premierDestinataire = (colis[0] as { destinataire_nom: string } | undefined)?.destinataire_nom ?? '—'
  const nbColis = colis.length

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-base font-bold text-gray-900">Preuve de livraison</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Signature + photo obligatoires avant de confirmer
        </p>
      </div>

      <LivraisonForm
        demandeId={demande.id}
        reference={demande.reference}
        destinataireNom={premierDestinataire}
        nbColis={nbColis}
      />
    </div>
  )
}
