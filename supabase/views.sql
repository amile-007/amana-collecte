-- ============================================================
-- AMANA Collecte — Vues matérialisées KPIs
-- Prérequis : activer pg_cron dans Supabase Dashboard
--   → Database > Extensions > pg_cron → Enable
-- ============================================================

-- Vue matérialisée : KPIs par centre
CREATE MATERIALIZED VIEW IF NOT EXISTS vue_kpis_centre AS
SELECT
  c.id                                               AS centre_id,
  c.nom                                              AS centre_nom,
  c.ville                                            AS centre_ville,
  -- Demandes en attente d'affectation
  COUNT(d.id) FILTER (WHERE d.statut = 'en_attente') AS demandes_en_attente,
  -- Demandes actives (affectées ou en cours)
  COUNT(d.id) FILTER (WHERE d.statut IN ('affectee','en_cours')) AS demandes_actives,
  -- Demandes collectées aujourd'hui
  COUNT(d.id) FILTER (
    WHERE d.statut = 'collectee'
    AND d.updated_at >= CURRENT_DATE
  )                                                  AS collectees_aujourd_hui,
  -- Anomalies ouvertes
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.statut_traitement = 'ouverte'
  )                                                  AS anomalies_ouvertes,
  -- Collecteurs disponibles
  COUNT(DISTINCT col.id) FILTER (
    WHERE col.statut = 'disponible'
  )                                                  AS collecteurs_disponibles,
  -- Collecteurs en mission
  COUNT(DISTINCT col.id) FILTER (
    WHERE col.statut = 'en_mission'
  )                                                  AS collecteurs_en_mission,
  -- Taux de complétion (collectée / total non-annulée)
  ROUND(
    100.0 * COUNT(d.id) FILTER (WHERE d.statut IN ('collectee','livree','deposee_centre'))
    / NULLIF(COUNT(d.id) FILTER (WHERE d.statut != 'annulee'), 0),
    1
  )                                                  AS taux_completion_pct,
  NOW()                                              AS refreshed_at
FROM centres c
LEFT JOIN demandes d ON d.centre_id = c.id
LEFT JOIN anomalies a ON a.demande_id = d.id
LEFT JOIN collecteurs col ON col.centre_id = c.id
WHERE c.actif = true
GROUP BY c.id, c.nom, c.ville;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_vue_kpis_centre_id
  ON vue_kpis_centre(centre_id);

-- ─── Rafraîchissement automatique via pg_cron (toutes les 5 min) ─────────────
-- À exécuter APRÈS avoir activé pg_cron :
--
-- SELECT cron.schedule(
--   'refresh-vue-kpis-centre',
--   '*/5 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY vue_kpis_centre'
-- );
--
-- Pour vérifier les jobs planifiés :
-- SELECT * FROM cron.job;
-- ─────────────────────────────────────────────────────────────────────────────

-- Rafraîchissement manuel (à lancer après CREATE) :
REFRESH MATERIALIZED VIEW vue_kpis_centre;
