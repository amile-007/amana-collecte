-- ============================================================
-- AMANA Collecte — Correction rattachement centre
-- Demande AMD-20260410-0001 → Centre Rabat Agdal
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Vérification avant correction
SELECT
  d.reference,
  d.statut,
  d.adresse_collecte_texte,
  d.centre_id,
  c.nom AS centre_actuel
FROM demandes d
LEFT JOIN centres c ON c.id = d.centre_id
WHERE d.reference = 'AMD-20260410-0001';

-- 2. Correction du rattachement
UPDATE demandes
SET centre_id = (
  SELECT id FROM centres WHERE nom = 'Centre Rabat Agdal' LIMIT 1
)
WHERE reference = 'AMD-20260410-0001';

-- 3. Vérification après correction
SELECT
  d.reference,
  d.statut,
  d.adresse_collecte_texte,
  d.centre_id,
  c.nom AS centre_apres_correction
FROM demandes d
LEFT JOIN centres c ON c.id = d.centre_id
WHERE d.reference = 'AMD-20260410-0001';

-- ============================================================
-- Vérification comptes chefs de centre existants
-- Exécuter pour identifier le chef rattaché à Rabat Agdal
-- ============================================================
SELECT
  au.email,
  p.prenom,
  p.nom,
  p.role,
  p.actif,
  c.nom  AS centre,
  c.ville
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN centres c ON c.id = p.centre_id
WHERE p.role = 'chef_centre'
ORDER BY c.ville;
