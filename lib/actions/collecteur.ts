'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getCollecteur() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'collecteur') throw new Error('Non autorisé')
  return { supabase, userId: user.id }
}

export async function demarrerMission(demandeId: string): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getCollecteur()
    await supabase
      .from('demandes')
      .update({ statut: 'en_cours' })
      .eq('id', demandeId)
      .eq('collecteur_id', userId)
    await supabase.from('statuts_historique').insert({
      demande_id: demandeId,
      statut_avant: 'affectee',
      statut_apres: 'en_cours',
      acteur_id: userId,
      acteur_role: 'collecteur',
      commentaire: 'Mission démarrée par le collecteur',
    })
    revalidatePath('/collecteur/missions')
    return {}
  } catch {
    return { error: 'Erreur lors du démarrage de la mission' }
  }
}

export async function confirmerCollecte(demandeId: string): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getCollecteur()
    const { data: demande } = await supabase
      .from('demandes')
      .select('statut')
      .eq('id', demandeId)
      .single()
    await supabase
      .from('demandes')
      .update({ statut: 'collectee' })
      .eq('id', demandeId)
      .eq('collecteur_id', userId)
    await supabase.from('statuts_historique').insert({
      demande_id: demandeId,
      statut_avant: demande?.statut ?? 'en_cours',
      statut_apres: 'collectee',
      acteur_id: userId,
      acteur_role: 'collecteur',
      commentaire: 'Collecte confirmée par le collecteur',
    })
    revalidatePath('/collecteur/missions')
    return {}
  } catch {
    return { error: 'Erreur lors de la confirmation' }
  }
}

export async function declarerAnomalie(
  demandeId: string,
  typeAnomalie: string,
  commentaire: string
): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getCollecteur()
    const { data: demande } = await supabase
      .from('demandes')
      .select('statut')
      .eq('id', demandeId)
      .single()
    await supabase.from('anomalies').insert({
      demande_id: demandeId,
      collecteur_id: userId,
      type_anomalie: typeAnomalie,
      commentaire,
      statut_traitement: 'ouverte',
    })
    await supabase
      .from('demandes')
      .update({ statut: 'anomalie' })
      .eq('id', demandeId)
      .eq('collecteur_id', userId)
    await supabase.from('statuts_historique').insert({
      demande_id: demandeId,
      statut_avant: demande?.statut ?? null,
      statut_apres: 'anomalie',
      acteur_id: userId,
      acteur_role: 'collecteur',
      commentaire,
    })
    revalidatePath('/collecteur/missions')
    return {}
  } catch {
    return { error: 'Erreur lors de la déclaration' }
  }
}

export async function confirmerLivraison(
  demandeId: string,
  opts: { signatureRecueillie: boolean; photoUrl?: string }
): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getCollecteur()

    const { data: demande } = await supabase
      .from('demandes')
      .select('statut, client_id, reference')
      .eq('id', demandeId)
      .eq('collecteur_id', userId)
      .single()

    if (!demande) return { error: 'Demande introuvable' }
    if (demande.statut !== 'collectee') return { error: 'Statut invalide pour la livraison' }

    await supabase
      .from('demandes')
      .update({ statut: 'livree' })
      .eq('id', demandeId)
      .eq('collecteur_id', userId)

    const commentaire = [
      'Livraison confirmée',
      opts.signatureRecueillie ? '✓ Signature recueillie' : null,
      opts.photoUrl ? '✓ Photo de preuve enregistrée' : null,
    ]
      .filter(Boolean)
      .join(' — ')

    await supabase.from('statuts_historique').insert({
      demande_id: demandeId,
      statut_avant: 'collectee',
      statut_apres: 'livree',
      acteur_id: userId,
      acteur_role: 'collecteur',
      commentaire,
    })

    await supabase.from('notifications').insert({
      destinataire_id: demande.client_id,
      type_evenement:  'livraison_confirmee',
      titre:           'Colis livré !',
      message:         `Votre demande ${demande.reference} a été livrée avec succès.`,
      demande_id:      demandeId,
    })

    revalidatePath('/collecteur/missions')
    return {}
  } catch {
    return { error: 'Erreur lors de la confirmation de livraison' }
  }
}

export async function updateStatutCollecteur(
  statut: 'disponible' | 'en_mission' | 'indisponible'
): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getCollecteur()
    await supabase.from('collecteurs').update({ statut }).eq('id', userId)
    revalidatePath('/collecteur/profil')
    return {}
  } catch {
    return { error: 'Erreur lors de la mise à jour du statut' }
  }
}
