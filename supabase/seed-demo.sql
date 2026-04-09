-- ============================================================
-- SEED DEMO — Scénario complet de démonstration AMANA Collecte
-- Prérequis : exécuter seed-auth.md d'abord pour créer les comptes
--             client@demo.ma et collecteur1@demo.ma dans auth.users
-- ============================================================

DO $$
DECLARE
  v_client_id       uuid;
  v_collecteur_id   uuid;
  v_centre_id       uuid;
  v_demande_id      uuid;
  v_colis1_id       uuid;
  v_colis2_id       uuid;
  v_ref_demande     text := 'AMD-DEMO-0001';
  v_ref_colis1      text := 'COL-DEMO-0001';
  v_ref_colis2      text := 'COL-DEMO-0002';
BEGIN

  -- ── 1. Résolution des IDs ──────────────────────────────────
  SELECT id INTO v_client_id
    FROM auth.users WHERE email = 'client@demo.ma';

  SELECT id INTO v_collecteur_id
    FROM auth.users WHERE email = 'collecteur1@demo.ma';

  SELECT id INTO v_centre_id
    FROM public.centres WHERE nom = 'Centre Casablanca Maarif';

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Compte client@demo.ma introuvable. Exécutez seed-auth.md en premier.';
  END IF;

  IF v_collecteur_id IS NULL THEN
    RAISE EXCEPTION 'Compte collecteur1@demo.ma introuvable. Exécutez seed-auth.md en premier.';
  END IF;

  IF v_centre_id IS NULL THEN
    RAISE EXCEPTION 'Centre Casablanca Maarif introuvable. Exécutez schema.sql en premier.';
  END IF;

  -- ── Nettoyage : supprimer l'ancienne démo si elle existe ───
  DELETE FROM public.notifications
    WHERE demande_id IN (SELECT id FROM public.demandes WHERE reference = v_ref_demande);

  DELETE FROM public.statuts_historique
    WHERE demande_id IN (SELECT id FROM public.demandes WHERE reference = v_ref_demande);

  DELETE FROM public.colis
    WHERE demande_id IN (SELECT id FROM public.demandes WHERE reference = v_ref_demande);

  DELETE FROM public.demandes WHERE reference = v_ref_demande;

  -- ── 2. Créer la demande AMD-DEMO-0001 ─────────────────────
  v_demande_id := gen_random_uuid();

  INSERT INTO public.demandes (
    id,
    reference,
    client_id,
    collecteur_id,
    centre_id,
    type_variante,
    statut,
    adresse_collecte_texte,
    adresse_collecte_lat,
    adresse_collecte_lng,
    montant_total,
    mode_paiement,
    paiement_statut,
    qr_code_data,
    created_at
  ) VALUES (
    v_demande_id,
    v_ref_demande,
    v_client_id,
    v_collecteur_id,
    v_centre_id,
    'intra_ville',
    'affectee',
    'Boulevard Anfa, Casablanca',
    33.5950,
    -7.6320,
    60.00,          -- 30 MAD × 2 colis
    'especes',
    'en_attente',
    'AMD-DEMO-0001|' || v_client_id::text,
    now() - interval '2 hours'
  );

  -- ── 3. Créer les 2 colis ───────────────────────────────────
  v_colis1_id := gen_random_uuid();
  v_colis2_id := gen_random_uuid();

  INSERT INTO public.colis (
    id,
    demande_id,
    reference,
    destination_ville,
    destinataire_nom,
    destinataire_telephone,
    destinataire_adresse,
    poids_declare,
    tarif_unitaire,
    statut,
    created_at
  ) VALUES
  (
    v_colis1_id,
    v_demande_id,
    v_ref_colis1,
    'Casablanca',
    'Ahmed Benali',
    '0661234567',
    'Rue des Orangers 12, Maarif, Casablanca',
    2.0,
    30.00,
    'en_attente',
    now() - interval '2 hours'
  ),
  (
    v_colis2_id,
    v_demande_id,
    v_ref_colis2,
    'Casablanca',
    'Fatima Zahra Idrissi',
    '0677654321',
    'Avenue Hassan II 45, Ain Diab, Casablanca',
    5.0,
    30.00,
    'en_attente',
    now() - interval '2 hours'
  );

  -- ── 4. Historique de statuts ───────────────────────────────
  -- Transition initiale : NULL → en_attente (création par le client)
  INSERT INTO public.statuts_historique (
    demande_id, statut_avant, statut_apres,
    acteur_id, acteur_role, commentaire, created_at
  ) VALUES (
    v_demande_id,
    NULL,
    'en_attente',
    v_client_id,
    'client',
    'Demande créée via le portail client',
    now() - interval '2 hours'
  );

  -- Transition : en_attente → affectee (affectation par le chef de centre)
  INSERT INTO public.statuts_historique (
    demande_id, statut_avant, statut_apres,
    acteur_id, acteur_role, commentaire, created_at
  ) VALUES (
    v_demande_id,
    'en_attente',
    'affectee',
    v_collecteur_id,
    'chef_centre',
    'Affectée au collecteur disponible le plus proche',
    now() - interval '1 hour'
  );

  -- ── 5. Notification au collecteur ─────────────────────────
  INSERT INTO public.notifications (
    destinataire_id,
    type_evenement,
    titre,
    message,
    lu,
    demande_id,
    created_at
  ) VALUES (
    v_collecteur_id,
    'nouvelle_mission',
    'Nouvelle mission AMD-DEMO-0001',
    'Une collecte vous a été assignée au Boulevard Anfa, Casablanca. 2 colis à collecter.',
    false,
    v_demande_id,
    now() - interval '1 hour'
  );

  -- ── Notification au client (confirmation d'affectation) ───
  INSERT INTO public.notifications (
    destinataire_id,
    type_evenement,
    titre,
    message,
    lu,
    demande_id,
    created_at
  ) VALUES (
    v_client_id,
    'demande_affectee',
    'Votre demande AMD-DEMO-0001 est prise en charge',
    'Un collecteur a été assigné à votre demande. Il sera chez vous sous peu.',
    false,
    v_demande_id,
    now() - interval '1 hour'
  );

  -- ── Résumé ─────────────────────────────────────────────────
  RAISE NOTICE '✓ Demande     : % (id: %)', v_ref_demande, v_demande_id;
  RAISE NOTICE '✓ Colis 1     : % — Ahmed Benali, 2 kg, 30 MAD', v_ref_colis1;
  RAISE NOTICE '✓ Colis 2     : % — Fatima Zahra Idrissi, 5 kg, 30 MAD', v_ref_colis2;
  RAISE NOTICE '✓ Statut      : en_attente → affectee';
  RAISE NOTICE '✓ Client      : % (id: %)', 'client@demo.ma', v_client_id;
  RAISE NOTICE '✓ Collecteur  : % (id: %)', 'collecteur1@demo.ma', v_collecteur_id;
  RAISE NOTICE '✓ Centre      : Centre Casablanca Maarif (id: %)', v_centre_id;
  RAISE NOTICE '✓ Notifications: 2 insérées (collecteur + client)';

END $$;
