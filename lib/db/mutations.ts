// ─── Mutations Supabase centralisées ──────────────────────────────────────────
// Convention :
//   - Transactions simulées via séquences (Supabase ne supporte pas les vraies transactions
//     depuis le client JS — utiliser des fonctions RPC PostgreSQL pour les transactions critiques)
//   - Chaque mutation invalide les caches concernés via revalidatePath/revalidateTag
//   - Toujours insérer dans statuts_historique après un changement de statut

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StatutDemande } from '@/lib/types'

// ─── Demandes ─────────────────────────────────────────────────────────────────

export async function updateStatutDemande(
  supabase: SupabaseClient,
  opts: {
    demandeId:    string
    statutAvant:  string
    statutApres:  StatutDemande
    acteurId:     string
    acteurRole:   string
    commentaire?: string
    centreId?:    string
  }
) {
  const { error: updateError } = await supabase
    .from('demandes')
    .update({ statut: opts.statutApres, updated_at: new Date().toISOString() })
    .eq('id', opts.demandeId)

  if (updateError) return { error: updateError.message }

  const { error: histError } = await supabase.from('statuts_historique').insert({
    demande_id:   opts.demandeId,
    statut_avant: opts.statutAvant,
    statut_apres: opts.statutApres,
    acteur_id:    opts.acteurId,
    acteur_role:  opts.acteurRole,
    commentaire:  opts.commentaire ?? null,
  })

  if (histError) return { error: histError.message }

  revalidatePath('/dashboard')
  revalidatePath('/mes-demandes')
  revalidatePath('/backoffice/demandes')
  revalidatePath('/collecteur/missions')

  return { error: null }
}

export async function affecterCollecteur(
  supabase: SupabaseClient,
  opts: {
    demandeId:    string
    collecteurId: string
    centreId:     string
    acteurId:     string
    statutActuel: string
  }
) {
  const { error } = await supabase.from('demandes').update({
    statut:        'affectee',
    collecteur_id: opts.collecteurId,
    centre_id:     opts.centreId,
    updated_at:    new Date().toISOString(),
  }).eq('id', opts.demandeId)

  if (error) return { error: error.message }

  await supabase.from('statuts_historique').insert({
    demande_id:   opts.demandeId,
    statut_avant: opts.statutActuel,
    statut_apres: 'affectee',
    acteur_id:    opts.acteurId,
    acteur_role:  'chef_centre',
    commentaire:  opts.statutActuel === 'affectee' ? 'Réaffectée' : 'Affectée',
  })

  await supabase.from('notifications').insert({
    destinataire_id: opts.collecteurId,
    type_evenement:  'demande_affectee',
    titre:           'Nouvelle mission affectée',
    message:         `Une demande vous a été affectée.`,
    demande_id:      opts.demandeId,
  })

  revalidatePath('/backoffice/demandes')
  revalidatePath('/collecteur/missions')
  return { error: null }
}

// ─── Réaffectation (chef de centre) ──────────────────────────────────────────

export async function reassignerDemande(
  supabase: SupabaseClient,
  opts: {
    demandeId:           string
    nouveauCollecteurId: string
    acteurId:            string
    acteurRole:          string
  }
) {
  const { data: demande } = await supabase
    .from('demandes')
    .select('collecteur_id, reference, client_id')
    .eq('id', opts.demandeId)
    .single()

  if (!demande) return { error: 'Demande introuvable' }

  const ancienCollecteurId = demande.collecteur_id as string | null

  const { error } = await supabase.from('demandes').update({
    collecteur_id: opts.nouveauCollecteurId,
    statut:        'affectee',
    updated_at:    new Date().toISOString(),
  }).eq('id', opts.demandeId)

  if (error) return { error: error.message }

  await supabase.from('statuts_historique').insert({
    demande_id:   opts.demandeId,
    statut_avant: 'affectee',
    statut_apres: 'affectee',
    acteur_id:    opts.acteurId,
    acteur_role:  opts.acteurRole,
    commentaire:  'Réaffectée par le chef de centre',
  })

  // Notif ancien collecteur (s'il existe et est différent)
  if (ancienCollecteurId && ancienCollecteurId !== opts.nouveauCollecteurId) {
    await supabase.from('notifications').insert({
      destinataire_id: ancienCollecteurId,
      type_evenement:  'demande_reaffectee',
      titre:           'Mission réaffectée',
      message:         `La demande ${demande.reference} vous a été retirée.`,
      demande_id:      opts.demandeId,
    })
  }

  // Notif nouveau collecteur
  await supabase.from('notifications').insert({
    destinataire_id: opts.nouveauCollecteurId,
    type_evenement:  'demande_affectee',
    titre:           'Nouvelle mission assignée',
    message:         `La demande ${demande.reference} vous a été assignée.`,
    demande_id:      opts.demandeId,
  })

  revalidatePath('/backoffice/demandes')
  revalidatePath('/collecteur/missions')
  return { error: null }
}

// ─── Position GPS ─────────────────────────────────────────────────────────────

export async function updatePosition(
  supabase: SupabaseClient,
  collecteurId: string,
  lat: number,
  lng: number
) {
  const { error } = await supabase.from('collecteurs').update({
    position_lat:        lat,
    position_lng:        lng,
    position_updated_at: new Date().toISOString(),
  }).eq('id', collecteurId)

  return { error: error?.message ?? null }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  ids: string[]
) {
  const { error } = await supabase
    .from('notifications')
    .update({ lu: true })
    .eq('destinataire_id', userId)
    .in('id', ids)

  if (!error) revalidatePath('/notifications')
  return { error: error?.message ?? null }
}

// ─── Anomalies ────────────────────────────────────────────────────────────────

export async function createAnomalie(
  supabase: SupabaseClient,
  opts: {
    demandeId:    string
    collecteurId: string
    typeAnomalie: string
    commentaire:  string
    statutAvant:  string
  }
) {
  const { error: anomalieError } = await supabase.from('anomalies').insert({
    demande_id:       opts.demandeId,
    collecteur_id:    opts.collecteurId,
    type_anomalie:    opts.typeAnomalie,
    commentaire:      opts.commentaire,
    statut_traitement: 'ouverte',
  })

  if (anomalieError) return { error: anomalieError.message }

  return updateStatutDemande(supabase, {
    demandeId:   opts.demandeId,
    statutAvant: opts.statutAvant,
    statutApres: 'anomalie',
    acteurId:    opts.collecteurId,
    acteurRole:  'collecteur',
    commentaire: opts.commentaire,
  })
}
