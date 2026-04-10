-- ============================================================
-- AMANA Collecte — Index de performance
-- À exécuter dans Supabase SQL Editor
-- CONCURRENTLY = sans lock table (safe en production)
-- ============================================================

-- Demandes : filtrage par statut + centre (backoffice chef_centre)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_demandes_statut_centre
  ON demandes(statut, centre_id, created_at DESC);

-- Demandes : filtrage par client (portail client)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_demandes_client_statut
  ON demandes(client_id, statut, created_at DESC);

-- Demandes : filtrage par collecteur (interface collecteur)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_demandes_collecteur_statut
  ON demandes(collecteur_id, statut, updated_at DESC);

-- Colis : jointure avec demandes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colis_demande_statut
  ON colis(demande_id, statut);

-- Collecteurs : carte GPS + filtrage par centre/statut
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collecteurs_position
  ON collecteurs(centre_id, statut, position_updated_at DESC);

-- Notifications : lecture par destinataire (badge non-lu)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_destinataire_lu
  ON notifications(destinataire_id, lu, created_at DESC);

-- Historique statuts : timeline par demande
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_statuts_historique_demande
  ON statuts_historique(demande_id, created_at DESC);

-- Anomalies : filtrage par centre via jointure collecteurs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomalies_demande
  ON anomalies(demande_id, statut_traitement, created_at DESC);
