// ─── Requêtes Supabase centralisées ──────────────────────────────────────────
// Convention :
//   - Toutes les fonctions reçoivent un client Supabase en premier argument
//   - Pagination cursor-based (jamais d'offset) pour les listes
//   - Typage strict via lib/types
//
// Usage dans un Server Component :
//   const supabase = await createClient()
//   const missions = await getMissionsCollecteur(supabase, user.id)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StatutDemande } from '@/lib/types'

// ─── Profils ──────────────────────────────────────────────────────────────────

export async function getProfile(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('profiles')
    .select('id, role, nom, prenom, telephone, centre_id, crbt_enabled, actif, created_at')
    .eq('id', userId)
    .single()
}

// ─── Demandes ─────────────────────────────────────────────────────────────────

export interface DemandesFilter {
  clientId?:    string
  collecteurId?: string
  centreId?:    string
  statuts?:     StatutDemande[]
  cursor?:      string   // created_at ISO string (exclusive, DESC)
  limit?:       number
}

export async function getDemandes(supabase: SupabaseClient, filter: DemandesFilter) {
  const limit = filter.limit ?? 20
  let query = supabase
    .from('demandes')
    .select('id, reference, statut, adresse_collecte_texte, type_variante, created_at, updated_at, client_id, collecteur_id, centre_id, montant_total')
    .order('created_at', { ascending: false })
    .limit(limit + 1) // +1 pour détecter s'il y a une page suivante

  if (filter.clientId)     query = query.eq('client_id', filter.clientId)
  if (filter.collecteurId) query = query.eq('collecteur_id', filter.collecteurId)
  if (filter.centreId)     query = query.eq('centre_id', filter.centreId)
  if (filter.statuts?.length) query = query.in('statut', filter.statuts)
  if (filter.cursor)       query = query.lt('created_at', filter.cursor)

  const { data, error } = await query
  const hasNextPage = (data?.length ?? 0) > limit
  const items = hasNextPage ? data!.slice(0, limit) : (data ?? [])
  const nextCursor = hasNextPage ? items[items.length - 1]?.created_at : undefined

  return { data: items, nextCursor, error }
}

export async function getDemandeById(supabase: SupabaseClient, demandeId: string) {
  return supabase
    .from('demandes')
    .select('*, colis(*), statuts_historique(*, acteur:profiles(nom,prenom,role))')
    .eq('id', demandeId)
    .single()
}

export async function getMissionsCollecteur(supabase: SupabaseClient, collecteurId: string) {
  return supabase
    .from('demandes')
    .select('id, reference, adresse_collecte_texte, adresse_collecte_lat, adresse_collecte_lng, statut, notes, updated_at, colis(id)')
    .eq('collecteur_id', collecteurId)
    .in('statut', ['affectee', 'en_cours', 'collectee', 'anomalie'])
    .order('updated_at', { ascending: false })
}

// ─── Collecteurs ──────────────────────────────────────────────────────────────

export async function getCollecteursDuCentre(supabase: SupabaseClient, centreId: string) {
  const { data: collecteurs } = await supabase
    .from('collecteurs')
    .select('id, statut, zone_intervention, position_lat, position_lng, position_updated_at')
    .eq('centre_id', centreId)

  const ids = collecteurs?.map((c) => c.id) ?? []
  const { data: profiles } = ids.length > 0
    ? await supabase.from('profiles').select('id, nom, prenom, telephone, actif').in('id', ids)
    : { data: [] }

  return (collecteurs ?? []).map((c) => ({
    ...c,
    ...(profiles?.find((p) => p.id === c.id) ?? {}),
  }))
}

export async function getCollecteurById(supabase: SupabaseClient, collecteurId: string) {
  return supabase
    .from('collecteurs')
    .select('*, profiles(nom, prenom, telephone)')
    .eq('id', collecteurId)
    .single()
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  opts?: { unreadOnly?: boolean; cursor?: string; limit?: number }
) {
  const limit = opts?.limit ?? 20
  let query = supabase
    .from('notifications')
    .select('id, type_evenement, titre, message, demande_id, lu, created_at')
    .eq('destinataire_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (opts?.unreadOnly) query = query.eq('lu', false)
  if (opts?.cursor)     query = query.lt('created_at', opts.cursor)

  const { data, error } = await query
  const hasNextPage = (data?.length ?? 0) > limit
  const items = hasNextPage ? data!.slice(0, limit) : (data ?? [])

  return { data: items, nextCursor: hasNextPage ? items[items.length - 1]?.created_at : undefined, error }
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('destinataire_id', userId)
    .eq('lu', false)
}

// ─── Centres ──────────────────────────────────────────────────────────────────

export async function getCentres(supabase: SupabaseClient) {
  return supabase.from('centres').select('id, nom, ville, latitude, longitude').eq('actif', true)
}

// ─── KPIs (via vue matérialisée) ──────────────────────────────────────────────

export async function getKpisCentre(supabase: SupabaseClient, centreId: string) {
  return supabase
    .from('vue_kpis_centre')
    .select('*')
    .eq('centre_id', centreId)
    .single()
}

// ─── Barèmes tarifaires ───────────────────────────────────────────────────────

export async function getTarif(
  supabase: SupabaseClient,
  villeOrigine: string,
  villeDestination: string,
  poidsKg: number
) {
  return supabase
    .from('baremes_tarifaires')
    .select('tarif_ht, poids_min_kg, poids_max_kg')
    .eq('ville_origine', villeOrigine)
    .eq('ville_destination', villeDestination)
    .eq('actif', true)
    .lte('poids_min_kg', poidsKg)
    .gte('poids_max_kg', poidsKg)
    .single()
}
