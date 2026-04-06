// ─── Entités métier AMANA Collecte ───────────────────────────────────────────

export type Role = 'client' | 'collecteur' | 'chef_centre' | 'admin' | 'superviseur'

export interface Profile {
  id: string
  role: Role
  nom: string
  prenom: string
  telephone: string
  centre_id: string | null
  crbt_enabled: boolean
  actif: boolean
  created_at: string
}

export interface Centre {
  id: string
  nom: string
  ville: string
  adresse: string
  latitude: number
  longitude: number
  actif: boolean
}

export type StatutDemande =
  | 'en_attente'
  | 'affectee'
  | 'en_cours'
  | 'collectee'
  | 'en_transit'
  | 'livree'
  | 'deposee_centre'
  | 'en_instance'
  | 'retournee'
  | 'anomalie'
  | 'annulee'

export interface Demande {
  id: string
  reference: string
  client_id: string
  collecteur_id: string | null
  centre_id: string | null
  type_variante: 'inter_ville' | 'intra_ville'
  statut: StatutDemande
  adresse_collecte_texte: string
  adresse_collecte_lat: number | null
  adresse_collecte_lng: number | null
  montant_total: number | null
  mode_paiement: 'en_ligne' | 'especes'
  paiement_statut: 'en_attente' | 'confirme' | 'echoue'
  notes: string | null
  qr_code_data: string | null
  created_at: string
  updated_at: string
  // Relations
  colis?: Colis[]
}

export interface Colis {
  id: string
  demande_id: string
  reference: string
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
  poids_volumetrique: number  // calculé par Supabase : L×l×h/3000
  poids_reference: number     // calculé par Supabase : MAX(poids_declare, poids_volumetrique)
  tarif_unitaire: number | null
  statut: string | null
  created_at: string
}

export interface StatutHistorique {
  id: string
  demande_id: string
  statut_avant: string | null
  statut_apres: string
  acteur_id: string | null
  acteur_role: string | null
  commentaire: string | null
  created_at: string
}

export interface Notification {
  id: string
  destinataire_id: string
  type_evenement: string
  titre: string
  message: string
  demande_id: string | null
  lu: boolean
  created_at: string
}

// ─── Barème tarifaire simplifié (démo) ───────────────────────────────────────

export interface BaremeTarifaire {
  id: string
  ville_origine: string
  ville_destination: string
  poids_min_kg: number
  poids_max_kg: number
  tarif_ht: number
  actif: boolean
}

// ─── Formulaire création demande (state local, pas en base) ──────────────────

export interface ColisFormData {
  destination_ville: string
  destinataire_nom: string
  destinataire_telephone: string
  destinataire_adresse: string
  poids_declare: number | ''
  longueur: number | ''
  largeur: number | ''
  hauteur: number | ''
}

export interface DemandeFormData {
  adresse_collecte_texte: string
  adresse_collecte_lat: number | null
  adresse_collecte_lng: number | null
  type_variante: 'inter_ville' | 'intra_ville'
  mode_paiement: 'especes'
  notes: string
  colis: ColisFormData[]
}
