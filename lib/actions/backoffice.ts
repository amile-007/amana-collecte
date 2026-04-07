'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getChef() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase
    .from('profiles')
    .select('centre_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'chef_centre') throw new Error('Non autorisé')
  return { supabase, userId: user.id, centreId: profile.centre_id as string }
}

export async function affecterDemande(
  demandeId: string,
  collecteurId: string
): Promise<{ error?: string }> {
  try {
    const { supabase, userId, centreId } = await getChef()

    const { data: demande } = await supabase
      .from('demandes')
      .select('statut, reference, client_id')
      .eq('id', demandeId)
      .single()

    if (!demande) return { error: 'Demande introuvable' }
    if (!['en_attente', 'affectee'].includes(demande.statut)) return { error: 'Demande non affectable' }

    const statutAvant = demande.statut

    await supabase.from('demandes').update({
      statut: 'affectee',
      collecteur_id: collecteurId,
      centre_id: centreId,
    }).eq('id', demandeId)

    await supabase.from('statuts_historique').insert({
      demande_id: demandeId,
      statut_avant: statutAvant,
      statut_apres: 'affectee',
      acteur_id: userId,
      acteur_role: 'chef_centre',
      commentaire: statutAvant === 'affectee'
        ? 'Réaffectée par le chef de centre'
        : 'Affectée par le chef de centre',
    })

    // Notif collecteur
    await supabase.from('notifications').insert({
      destinataire_id: collecteurId,
      type_evenement: 'demande_affectee',
      titre: 'Nouvelle mission affectée',
      message: `La demande ${demande.reference} vous a été affectée.`,
      demande_id: demandeId,
    })

    // Notif client (première affectation uniquement)
    if (statutAvant === 'en_attente') {
      await supabase.from('notifications').insert({
        destinataire_id: demande.client_id,
        type_evenement: 'demande_affectee',
        titre: 'Demande prise en charge',
        message: `Votre demande ${demande.reference} a été affectée à un collecteur.`,
        demande_id: demandeId,
      })
    }

    revalidatePath('/backoffice/demandes')
    revalidatePath('/backoffice/dashboard')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function annulerDemandeAdmin(demandeId: string): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getChef()

    const { data: demande } = await supabase
      .from('demandes')
      .select('statut, client_id, reference')
      .eq('id', demandeId)
      .single()

    if (!demande) return { error: 'Demande introuvable' }

    await supabase.from('demandes').update({ statut: 'annulee' }).eq('id', demandeId)

    await supabase.from('statuts_historique').insert({
      demande_id: demandeId,
      statut_avant: demande.statut,
      statut_apres: 'annulee',
      acteur_id: userId,
      acteur_role: 'chef_centre',
      commentaire: 'Annulée par le chef de centre suite à anomalie',
    })

    await supabase.from('notifications').insert({
      destinataire_id: demande.client_id,
      type_evenement: 'anomalie',
      titre: 'Demande annulée',
      message: `Votre demande ${demande.reference} a été annulée suite à une anomalie.`,
      demande_id: demandeId,
    })

    revalidatePath('/backoffice/demandes')
    revalidatePath('/backoffice/anomalies')
    revalidatePath('/backoffice/dashboard')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function toggleCollecteurActif(
  collecteurId: string,
  actif: boolean
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getChef()
    await supabase.from('profiles').update({ actif }).eq('id', collecteurId)
    revalidatePath('/backoffice/collecteurs')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function validerDepot(depotId: string): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getChef()

    const { data: depot } = await supabase
      .from('depots')
      .select('montant_especes_attendu')
      .eq('id', depotId)
      .single()

    if (!depot) return { error: 'Dépôt introuvable' }

    await supabase.from('depots').update({
      statut: 'valide',
      validated_by: userId,
      montant_especes_verse: depot.montant_especes_attendu,
    }).eq('id', depotId)

    revalidatePath('/backoffice/depots')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function signalerEcartDepot(
  depotId: string,
  montantVerse: number
): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await getChef()

    await supabase.from('depots').update({
      statut: 'valide',
      validated_by: userId,
      montant_especes_verse: montantVerse,
    }).eq('id', depotId)

    revalidatePath('/backoffice/depots')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function resoudreAnomalie(
  anomalieId: string,
  action: 'reaffecter' | 'annuler',
  nouveauCollecteurId?: string
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getChef()

    const { data: anomalie } = await supabase
      .from('anomalies')
      .select('demande_id')
      .eq('id', anomalieId)
      .single()

    if (!anomalie) return { error: 'Anomalie introuvable' }

    let result: { error?: string }
    if (action === 'annuler') {
      result = await annulerDemandeAdmin(anomalie.demande_id)
    } else if (action === 'reaffecter' && nouveauCollecteurId) {
      result = await affecterDemande(anomalie.demande_id, nouveauCollecteurId)
    } else {
      return { error: 'Action invalide' }
    }

    if (!result.error) {
      await supabase
        .from('anomalies')
        .update({ statut_traitement: 'resolue' })
        .eq('id', anomalieId)
    }

    revalidatePath('/backoffice/anomalies')
    return result
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}
