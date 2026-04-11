'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface ColisPayload {
  destination_ville: string
  destinataire_nom: string
  destinataire_telephone: string
  destinataire_adresse: string
  destinataire_lat: number | null
  destinataire_lng: number | null
  poids_declare: number
  longueur: number
  largeur: number
  hauteur: number
  tarif_unitaire: number
  crbt_montant: number | null
}

export interface DemandePayload {
  adresse_collecte_texte: string
  adresse_collecte_lat: number | null
  adresse_collecte_lng: number | null
  ville_collecte: string   // ex: 'Casablanca' | 'Rabat' — sert à rattacher le bon centre
  type_variante: 'inter_ville' | 'intra_ville'
  notes: string
  colis: ColisPayload[]
}

export interface DemandeCreee {
  demandeId: string
  reference: string
  colisCreés: { reference: string; destinataire_nom: string; destination_ville: string }[]
  collecteurNom: string | null  // null si aucun collecteur disponible
}

/**
 * Affecte automatiquement la demande au collecteur disponible
 * le plus proche (distance euclidienne lat/lng).
 * Retourne le nom du collecteur affecté, ou null si aucun disponible.
 */
async function affectationAutomatique(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opts: {
    demandeId:  string
    centreId:   string | null
    adresseLat: number | null
    adresseLng: number | null
    clientId:   string
    reference:  string
  }
): Promise<string | null> {
  if (!opts.centreId) return null

  const { data: collecteurs } = await supabase
    .from('collecteurs')
    .select('id, position_lat, position_lng')
    .eq('centre_id', opts.centreId)
    .eq('statut', 'disponible')

  if (!collecteurs || collecteurs.length === 0) return null

  // Collecteur le plus proche — formule euclidienne (même ville, pas besoin de géodésie)
  let choisi = collecteurs[0]
  if (opts.adresseLat !== null && opts.adresseLng !== null) {
    const avecGPS = collecteurs.filter((c) => c.position_lat !== null && c.position_lng !== null)
    if (avecGPS.length > 0) {
      let minDist = Infinity
      for (const c of avecGPS) {
        const dist = Math.sqrt(
          Math.pow((c.position_lat as number) - opts.adresseLat!, 2) +
          Math.pow((c.position_lng as number) - opts.adresseLng!, 2)
        )
        if (dist < minDist) { minDist = dist; choisi = c }
      }
    }
  }

  await supabase.from('demandes').update({
    collecteur_id: choisi.id,
    statut: 'affectee',
  }).eq('id', opts.demandeId)

  await supabase.from('statuts_historique').insert({
    demande_id:   opts.demandeId,
    statut_avant: 'en_attente',
    statut_apres: 'affectee',
    acteur_id:    null,
    acteur_role:  'systeme',
    commentaire:  'Affectation automatique — collecteur le plus proche',
  })

  await supabase.from('notifications').insert({
    destinataire_id: choisi.id,
    type_evenement:  'demande_affectee',
    titre:           'Nouvelle mission affectée',
    message:         `La demande ${opts.reference} vous a été affectée automatiquement.`,
    demande_id:      opts.demandeId,
  })

  await supabase.from('notifications').insert({
    destinataire_id: opts.clientId,
    type_evenement:  'demande_affectee',
    titre:           'Collecteur assigné',
    message:         `Un collecteur a été assigné à votre demande ${opts.reference}.`,
    demande_id:      opts.demandeId,
  })

  const { data: profile } = await supabase
    .from('profiles')
    .select('prenom, nom')
    .eq('id', choisi.id)
    .single()

  return profile ? `${profile.prenom} ${profile.nom}` : null
}

/** Génère une référence au format AMD-YYYYMMDD-XXXX */
async function genererReference(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const debutJour = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

  const { count } = await supabase
    .from('demandes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', debutJour)

  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `AMD-${dateStr}-${seq}`
}

export async function createDemande(payload: DemandePayload): Promise<DemandeCreee> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const reference = await genererReference(supabase)
  const montantTotal = payload.colis.reduce((s, c) => s + c.tarif_unitaire, 0)

  // Récupérer le centre correspondant à la ville de collecte
  const { data: centre } = await supabase
    .from('centres')
    .select('id')
    .eq('ville', payload.ville_collecte)
    .eq('actif', true)
    .limit(1)
    .single()

  // Insertion de la demande
  const { data: demande, error: errDemande } = await supabase
    .from('demandes')
    .insert({
      reference,
      client_id: user.id,
      centre_id: centre?.id ?? null,
      type_variante: payload.type_variante,
      statut: 'en_attente',
      adresse_collecte_texte: payload.adresse_collecte_texte,
      adresse_collecte_lat: payload.adresse_collecte_lat,
      adresse_collecte_lng: payload.adresse_collecte_lng,
      montant_total: montantTotal,
      mode_paiement: 'especes',
      paiement_statut: 'en_attente',
      notes: payload.notes || null,
      qr_code_data: JSON.stringify({ ref: reference }),
    })
    .select('id')
    .single()

  if (errDemande || !demande) throw new Error(errDemande?.message ?? 'Erreur création demande')

  // Génération des références colis et insertion
  const dateStr = reference.slice(4, 12)
  const seqDemande = reference.slice(13)

  const colisAInserer = payload.colis.map((c, i) => ({
    demande_id: demande.id,
    reference: `COL-${dateStr}-${seqDemande}-${String(i + 1).padStart(2, '0')}`,
    destination_ville: c.destination_ville,
    destinataire_nom: c.destinataire_nom,
    destinataire_telephone: c.destinataire_telephone,
    destinataire_adresse: c.destinataire_adresse,
    destinataire_lat: c.destinataire_lat,
    destinataire_lng: c.destinataire_lng,
    poids_declare: c.poids_declare,
    longueur: c.longueur,
    largeur: c.largeur,
    hauteur: c.hauteur,
    tarif_unitaire: c.tarif_unitaire,
    crbt_montant: c.crbt_montant,
    statut: 'en_attente',
  }))

  const { data: colisInsérés, error: errColis } = await supabase
    .from('colis')
    .insert(colisAInserer)
    .select('reference, destinataire_nom, destination_ville')

  if (errColis) throw new Error(errColis.message)

  // Affectation automatique au collecteur le plus proche
  const collecteurNom = await affectationAutomatique(supabase, {
    demandeId:  demande.id,
    centreId:   centre?.id ?? null,
    adresseLat: payload.adresse_collecte_lat,
    adresseLng: payload.adresse_collecte_lng,
    clientId:   user.id,
    reference,
  })

  return {
    demandeId: demande.id,
    reference,
    colisCreés: colisInsérés ?? [],
    collecteurNom,
  }
}

/** Annule une demande (seulement si statut = en_attente et appartient au client) */
export async function annulerDemande(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: demande } = await supabase
    .from('demandes')
    .select('statut, client_id')
    .eq('id', id)
    .single()

  if (!demande || demande.client_id !== user.id) throw new Error('Non autorisé')
  if (demande.statut !== 'en_attente') throw new Error('Cette demande ne peut plus être annulée')

  await supabase.from('demandes').update({ statut: 'annulee' }).eq('id', id)

  await supabase.from('statuts_historique').insert({
    demande_id: id,
    statut_avant: 'en_attente',
    statut_apres: 'annulee',
    acteur_id: user.id,
    acteur_role: 'client',
    commentaire: 'Annulée par le client',
  })

  redirect('/mes-demandes')
}
