import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})

export const RegisterSchema = z.object({
  email:     z.string().email('Email invalide'),
  password:  z.string().min(8, 'Minimum 8 caractères'),
  nom:       z.string().min(1, 'Nom requis').max(100),
  prenom:    z.string().min(1, 'Prénom requis').max(100),
  telephone: z.string().regex(/^(\+212|0)[5-7]\d{8}$/, 'Numéro marocain invalide (ex: 0612345678)'),
})

// ─── Demande ──────────────────────────────────────────────────────────────────

export const ColisSchema = z.object({
  destination_ville:      z.string().min(1, 'Ville requise'),
  destinataire_nom:       z.string().min(1, 'Nom destinataire requis').max(100),
  destinataire_telephone: z.string().regex(/^(\+212|0)[5-7]\d{8}$/, 'Numéro invalide'),
  destinataire_adresse:   z.string().min(5, 'Adresse trop courte').max(300),
  poids_declare:          z.number().positive('Poids doit être positif').max(70, 'Max 70 kg'),
  longueur:               z.number().positive().max(200),
  largeur:                z.number().positive().max(200),
  hauteur:                z.number().positive().max(200),
})

export const DemandeSchema = z.object({
  adresse_collecte_texte: z.string().min(5, 'Adresse trop courte').max(300),
  adresse_collecte_lat:   z.number().min(-90).max(90).nullable(),
  adresse_collecte_lng:   z.number().min(-180).max(180).nullable(),
  type_variante:          z.enum(['inter_ville', 'intra_ville']),
  mode_paiement:          z.enum(['especes', 'en_ligne']),
  notes:                  z.string().max(500).optional().default(''),
  colis:                  z.array(ColisSchema).min(1, 'Au moins un colis requis').max(20),
})

export type DemandeInput = z.infer<typeof DemandeSchema>
export type ColisInput   = z.infer<typeof ColisSchema>

// ─── Anomalie ─────────────────────────────────────────────────────────────────

export const AnomalieSchema = z.object({
  demande_id:    z.string().uuid(),
  type_anomalie: z.enum(['absent', 'adresse_incorrecte', 'colis_refuse', 'acces_impossible', 'autre']),
  commentaire:   z.string().max(500).optional().default(''),
})

export type AnomalieInput = z.infer<typeof AnomalieSchema>

// ─── Position GPS ─────────────────────────────────────────────────────────────

export const PositionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export type PositionInput = z.infer<typeof PositionSchema>

// ─── Calcul tarif ─────────────────────────────────────────────────────────────

export const TarifCalculSchema = z.object({
  ville_origine:     z.string().min(1),
  ville_destination: z.string().min(1),
  poids_kg:          z.number().positive().max(70),
  longueur:          z.number().positive().optional(),
  largeur:           z.number().positive().optional(),
  hauteur:           z.number().positive().optional(),
})

export type TarifCalculInput = z.infer<typeof TarifCalculSchema>

// ─── Notification batch ───────────────────────────────────────────────────────

export const NotificationBatchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

// ─── Pagination cursor ────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  cursor:   z.string().optional(),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  statut:   z.string().optional(),
  centreId: z.string().uuid().optional(),
})

export type PaginationInput = z.infer<typeof PaginationSchema>
