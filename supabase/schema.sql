-- ============================================================
-- AMANA Collecte — Schéma Supabase
-- Projet : Digitalisation collecte de colis BARID AL MAGHRIB
-- Version : MVP Option A Scalable
-- ============================================================
-- Ordre d'exécution :
--   1. Tables (ordre FK)
--   2. Triggers et index
--   3. Fonctions public.user_role() et public.user_centre_id()
--   4. Activation RLS
--   5. Politiques RLS
--   6. Seed (centres, barèmes, types_anomalies)
--
-- NB : La création des comptes de démo (profiles + collecteurs)
--      se fait APRÈS avoir créé les utilisateurs via le dashboard
--      Supabase. Voir le guide : supabase/seed-auth.md
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- ------------------------------------------------------------
-- centres
-- (pas de dépendances — première table à créer)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.centres (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom       text NOT NULL,
  ville     text NOT NULL,
  adresse   text,
  latitude  float,
  longitude float,
  actif     boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.centres IS 'Centres de collecte AMANA (dépôts régionaux)';


-- ------------------------------------------------------------
-- types_anomalies
-- (administrable — pas de dépendances)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.types_anomalies (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text NOT NULL UNIQUE,
  actif   boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.types_anomalies IS 'Catalogue des types d''anomalies déclarables par les collecteurs';


-- ------------------------------------------------------------
-- baremes_tarifaires
-- (administrable — pas de dépendances)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.baremes_tarifaires (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ville_origine     text NOT NULL,
  ville_destination text NOT NULL,
  poids_min_kg      numeric(8,3) NOT NULL,
  poids_max_kg      numeric(8,3) NOT NULL,
  tarif_ht          numeric(10,2) NOT NULL,
  version           integer NOT NULL DEFAULT 1,
  actif             boolean NOT NULL DEFAULT true,
  date_application  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.baremes_tarifaires IS 'Grille tarifaire par ville origine/destination et tranche de poids';


-- ------------------------------------------------------------
-- profiles
-- (extension de auth.users — id fourni par Supabase Auth lors de l'inscription)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role         text NOT NULL CHECK (role IN ('client','collecteur','chef_centre','admin','superviseur')),
  nom          text,
  prenom       text,
  telephone    text,
  centre_id    uuid REFERENCES public.centres(id),    -- option_b : rattachement centre
  crm_id       text,                                   -- option_b : rattachement CRM BAM
  crbt_enabled boolean NOT NULL DEFAULT false,         -- option_b : activation CRBT
  actif        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Profils utilisateurs étendant auth.users — contient le rôle métier';


-- ------------------------------------------------------------
-- collecteurs
-- (vue étendue des profiles role=collecteur)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collecteurs (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  centre_id           uuid NOT NULL REFERENCES public.centres(id),
  zone_intervention   text,
  capacite_max_kg     float,
  statut              text NOT NULL DEFAULT 'disponible'
                        CHECK (statut IN ('disponible','en_mission','indisponible')),
  position_lat        float,      -- mis à jour en temps réel depuis l'app mobile
  position_lng        float,      -- mis à jour en temps réel depuis l'app mobile
  position_updated_at timestamptz
);

COMMENT ON TABLE public.collecteurs IS 'Données opérationnelles des collecteurs (statut, position GPS temps réel)';


-- ------------------------------------------------------------
-- demandes
-- (table centrale — dépend de profiles, collecteurs, centres)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demandes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference              text UNIQUE,  -- format : AMD-YYYYMMDD-XXXX
  client_id              uuid NOT NULL REFERENCES public.profiles(id),
  collecteur_id          uuid REFERENCES public.collecteurs(id),
  centre_id              uuid REFERENCES public.centres(id),
  type_variante          text NOT NULL
                           CHECK (type_variante IN ('inter_ville','intra_ville')),
  statut                 text NOT NULL DEFAULT 'en_attente'
                           CHECK (statut IN (
                             'en_attente','affectee','en_cours','collectee',
                             'en_transit','livree','deposee_centre',
                             'en_instance','retournee','anomalie','annulee'
                           )),
  adresse_collecte_texte text,
  adresse_collecte_lat   float,
  adresse_collecte_lng   float,
  montant_total          numeric(10,2),
  mode_paiement          text DEFAULT 'especes'
                           CHECK (mode_paiement IN ('en_ligne','especes')),  -- option_b : en_ligne
  paiement_statut        text DEFAULT 'en_attente'
                           CHECK (paiement_statut IN ('en_attente','confirme','echoue')),
  notes                  text,
  qr_code_data           text,  -- données encodées dans le QR code
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demandes IS 'Demandes de collecte — table centrale du workflow AMANA';


-- ------------------------------------------------------------
-- colis
-- (dépend de demandes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colis (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id             uuid NOT NULL REFERENCES public.demandes(id) ON DELETE CASCADE,
  reference              text UNIQUE,
  destination_ville      text,
  destinataire_nom       text,
  destinataire_telephone text,
  destinataire_adresse   text,
  destinataire_lat       float,
  destinataire_lng       float,
  poids_declare          numeric(8,3),   -- kg
  longueur               numeric(8,2),   -- cm
  largeur                numeric(8,2),   -- cm
  hauteur                numeric(8,2),   -- cm
  -- Colonnes calculées automatiquement par Postgres
  poids_volumetrique     numeric(8,3) GENERATED ALWAYS AS
                           (longueur * largeur * hauteur / 3000) STORED,
  poids_reference        numeric(8,3) GENERATED ALWAYS AS
                           (GREATEST(poids_declare, longueur * largeur * hauteur / 3000)) STORED,
  tarif_unitaire         numeric(10,2),
  poids_constate         numeric(8,3),   -- option_b : taxation au dépôt
  tarif_ajuste           numeric(10,2),  -- option_b : recalcul tarifaire
  crbt_montant           numeric(10,2),  -- option_b : CRBT
  crbt_encaisse          boolean NOT NULL DEFAULT false,  -- option_b
  statut                 text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.colis IS 'Colis rattachés à une demande — inclut calcul volumétrique automatique';


-- ------------------------------------------------------------
-- statuts_historique
-- (journal immuable des changements de statut)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statuts_historique (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id   uuid NOT NULL REFERENCES public.demandes(id) ON DELETE CASCADE,
  statut_avant text,
  statut_apres text NOT NULL,
  acteur_id    uuid REFERENCES public.profiles(id),
  acteur_role  text,
  commentaire  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.statuts_historique IS 'Historique immuable de tous les changements de statut des demandes';


-- ------------------------------------------------------------
-- anomalies
-- (dépend de demandes, collecteurs)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomalies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id        uuid NOT NULL REFERENCES public.demandes(id),
  collecteur_id     uuid REFERENCES public.collecteurs(id),
  type_anomalie     text REFERENCES public.types_anomalies(libelle),
  commentaire       text,
  photo_urls        text[],  -- tableau d'URLs Supabase Storage
  statut_traitement text NOT NULL DEFAULT 'ouverte'
                      CHECK (statut_traitement IN ('ouverte','en_cours','resolue')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.anomalies IS 'Anomalies déclarées par les collecteurs lors des missions';


-- ------------------------------------------------------------
-- notifications
-- (in-app — dépend de profiles, demandes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinataire_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_evenement  text NOT NULL,
  titre           text NOT NULL,
  message         text,
  demande_id      uuid REFERENCES public.demandes(id),
  lu              boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Notifications in-app envoyées aux utilisateurs à chaque événement métier';


-- ------------------------------------------------------------
-- audit_log
-- (journal d'audit de toutes les actions sensibles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id    uuid REFERENCES public.profiles(id),
  action       text NOT NULL,
  entite       text NOT NULL,
  entite_id    uuid,
  valeur_avant jsonb,
  valeur_apres jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS 'Journal d''audit de toutes les actions sensibles — lecture admin uniquement';


-- ------------------------------------------------------------
-- depots
-- (option_b — structure présente, non utilisée MVP)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.depots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collecteur_id           uuid NOT NULL REFERENCES public.collecteurs(id),
  centre_id               uuid NOT NULL REFERENCES public.centres(id),
  statut                  text NOT NULL DEFAULT 'en_attente'
                            CHECK (statut IN ('en_attente','valide','rejete')),
  montant_especes_attendu numeric(10,2),
  montant_especes_verse   numeric(10,2),
  validated_by            uuid REFERENCES public.profiles(id),
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.depots IS 'Dépôts de fin de journée des collecteurs au centre (option_b — structure anticipée)';


-- ============================================================
-- 2. TRIGGERS ET INDEX
-- ============================================================

-- Fonction générique pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Seule la table demandes possède updated_at (conformément au schéma PROJET.md)
CREATE TRIGGER set_demandes_updated_at
  BEFORE UPDATE ON public.demandes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_centre_id ON public.profiles(centre_id);

-- collecteurs
CREATE INDEX IF NOT EXISTS idx_collecteurs_centre_id ON public.collecteurs(centre_id);
CREATE INDEX IF NOT EXISTS idx_collecteurs_statut    ON public.collecteurs(statut);

-- demandes (colonnes les plus filtrées)
CREATE INDEX IF NOT EXISTS idx_demandes_client_id     ON public.demandes(client_id);
CREATE INDEX IF NOT EXISTS idx_demandes_collecteur_id ON public.demandes(collecteur_id);
CREATE INDEX IF NOT EXISTS idx_demandes_centre_id     ON public.demandes(centre_id);
CREATE INDEX IF NOT EXISTS idx_demandes_statut        ON public.demandes(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_reference     ON public.demandes(reference);
CREATE INDEX IF NOT EXISTS idx_demandes_created_at    ON public.demandes(created_at DESC);

-- colis
CREATE INDEX IF NOT EXISTS idx_colis_demande_id ON public.colis(demande_id);
CREATE INDEX IF NOT EXISTS idx_colis_statut     ON public.colis(statut);

-- statuts_historique
CREATE INDEX IF NOT EXISTS idx_statuts_historique_demande_id ON public.statuts_historique(demande_id);
CREATE INDEX IF NOT EXISTS idx_statuts_historique_created_at ON public.statuts_historique(created_at DESC);

-- anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_demande_id    ON public.anomalies(demande_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_collecteur_id ON public.anomalies(collecteur_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_statut        ON public.anomalies(statut_traitement);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_destinataire_id ON public.notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lu              ON public.notifications(lu) WHERE lu = false;
CREATE INDEX IF NOT EXISTS idx_notifications_demande_id      ON public.notifications(demande_id);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_acteur_id  ON public.audit_log(acteur_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entite     ON public.audit_log(entite, entite_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- depots
CREATE INDEX IF NOT EXISTS idx_depots_collecteur_id ON public.depots(collecteur_id);
CREATE INDEX IF NOT EXISTS idx_depots_centre_id     ON public.depots(centre_id);
CREATE INDEX IF NOT EXISTS idx_depots_statut        ON public.depots(statut);

-- baremes_tarifaires
CREATE INDEX IF NOT EXISTS idx_baremes_villes ON public.baremes_tarifaires(ville_origine, ville_destination);
CREATE INDEX IF NOT EXISTS idx_baremes_actif  ON public.baremes_tarifaires(actif) WHERE actif = true;


-- ============================================================
-- 3. FONCTIONS HELPERS RLS
-- (définies après les tables car elles lisent public.profiles)
-- ============================================================

-- Retourne le rôle métier de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Retourne le centre_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.user_centre_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT centre_id FROM public.profiles WHERE id = auth.uid()
$$;


-- ============================================================
-- 4. ACTIVATION RLS
-- ============================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collecteurs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colis              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuts_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baremes_tarifaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_anomalies    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. POLITIQUES RLS
-- Principe : chaque rôle ne voit que ses données.
-- Les politiques s'appuient sur public.user_role() et public.user_centre_id()
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_chef_centre"
  ON public.profiles FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND centre_id = public.user_centre_id()
  );

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.user_role() = 'admin');

-- Mise à jour propre : chacun modifie son profil mais ne peut pas changer son rôle
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.user_role() = 'admin');

-- Insertion via le flux d'inscription uniquement (id = uid de l'utilisateur créé)
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- CENTRES
-- ------------------------------------------------------------

CREATE POLICY "centres_select_authenticated"
  ON public.centres FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "centres_all_admin"
  ON public.centres FOR ALL
  USING (public.user_role() = 'admin');

-- ------------------------------------------------------------
-- COLLECTEURS
-- ------------------------------------------------------------

CREATE POLICY "collecteurs_select_own"
  ON public.collecteurs FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "collecteurs_select_chef_centre"
  ON public.collecteurs FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND centre_id = public.user_centre_id()
  );

-- Client : voit uniquement le collecteur assigné à sa mission en cours (suivi GPS)
CREATE POLICY "collecteurs_select_client"
  ON public.collecteurs FOR SELECT
  USING (
    public.user_role() = 'client'
    AND id IN (
      SELECT collecteur_id FROM public.demandes
      WHERE client_id = auth.uid()
        AND statut IN ('en_cours','collectee')
    )
  );

CREATE POLICY "collecteurs_select_admin"
  ON public.collecteurs FOR SELECT
  USING (public.user_role() = 'admin');

-- Collecteur : met à jour sa propre position GPS
CREATE POLICY "collecteurs_update_position_own"
  ON public.collecteurs FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Chef de centre et admin : mise à jour complète
CREATE POLICY "collecteurs_update_chef_centre_admin"
  ON public.collecteurs FOR UPDATE
  USING (
    public.user_role() IN ('chef_centre','admin')
    AND (public.user_role() = 'admin' OR centre_id = public.user_centre_id())
  );

CREATE POLICY "collecteurs_insert_admin"
  ON public.collecteurs FOR INSERT
  WITH CHECK (public.user_role() = 'admin');

-- ------------------------------------------------------------
-- DEMANDES
-- ------------------------------------------------------------

CREATE POLICY "demandes_select_client"
  ON public.demandes FOR SELECT
  USING (
    public.user_role() = 'client'
    AND client_id = auth.uid()
  );

CREATE POLICY "demandes_select_collecteur"
  ON public.demandes FOR SELECT
  USING (
    public.user_role() = 'collecteur'
    AND collecteur_id = auth.uid()
  );

CREATE POLICY "demandes_select_chef_centre"
  ON public.demandes FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND centre_id = public.user_centre_id()
  );

CREATE POLICY "demandes_select_admin"
  ON public.demandes FOR SELECT
  USING (public.user_role() IN ('admin','superviseur'));

CREATE POLICY "demandes_insert_client"
  ON public.demandes FOR INSERT
  WITH CHECK (
    public.user_role() = 'client'
    AND client_id = auth.uid()
  );

-- Collecteur : met à jour le statut de ses missions
CREATE POLICY "demandes_update_collecteur"
  ON public.demandes FOR UPDATE
  USING (
    public.user_role() = 'collecteur'
    AND collecteur_id = auth.uid()
  );

CREATE POLICY "demandes_update_chef_centre"
  ON public.demandes FOR UPDATE
  USING (
    public.user_role() = 'chef_centre'
    AND centre_id = public.user_centre_id()
  );

CREATE POLICY "demandes_update_admin"
  ON public.demandes FOR UPDATE
  USING (public.user_role() = 'admin');

-- Client : peut annuler sa demande si elle n'est pas encore collectée
CREATE POLICY "demandes_cancel_client"
  ON public.demandes FOR UPDATE
  USING (
    public.user_role() = 'client'
    AND client_id = auth.uid()
    AND statut NOT IN ('collectee','livree','deposee_centre','retournee')
  )
  WITH CHECK (statut = 'annulee');

-- ------------------------------------------------------------
-- COLIS
-- ------------------------------------------------------------

CREATE POLICY "colis_select_client"
  ON public.colis FOR SELECT
  USING (
    public.user_role() = 'client'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "colis_select_collecteur"
  ON public.colis FOR SELECT
  USING (
    public.user_role() = 'collecteur'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE collecteur_id = auth.uid()
    )
  );

CREATE POLICY "colis_select_chef_centre"
  ON public.colis FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE centre_id = public.user_centre_id()
    )
  );

CREATE POLICY "colis_select_admin"
  ON public.colis FOR SELECT
  USING (public.user_role() IN ('admin','superviseur'));

CREATE POLICY "colis_insert_client"
  ON public.colis FOR INSERT
  WITH CHECK (
    public.user_role() = 'client'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "colis_update_ops"
  ON public.colis FOR UPDATE
  USING (public.user_role() IN ('collecteur','chef_centre','admin'));

-- ------------------------------------------------------------
-- STATUTS_HISTORIQUE (lecture seule pour les acteurs concernés)
-- ------------------------------------------------------------

CREATE POLICY "statuts_historique_select_client"
  ON public.statuts_historique FOR SELECT
  USING (
    public.user_role() = 'client'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "statuts_historique_select_collecteur"
  ON public.statuts_historique FOR SELECT
  USING (
    public.user_role() = 'collecteur'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE collecteur_id = auth.uid()
    )
  );

CREATE POLICY "statuts_historique_select_chef_centre"
  ON public.statuts_historique FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE centre_id = public.user_centre_id()
    )
  );

CREATE POLICY "statuts_historique_select_admin"
  ON public.statuts_historique FOR SELECT
  USING (public.user_role() IN ('admin','superviseur'));

CREATE POLICY "statuts_historique_insert_ops"
  ON public.statuts_historique FOR INSERT
  WITH CHECK (public.user_role() IN ('client','collecteur','chef_centre','admin'));

-- ------------------------------------------------------------
-- ANOMALIES
-- ------------------------------------------------------------

CREATE POLICY "anomalies_select_collecteur"
  ON public.anomalies FOR SELECT
  USING (
    public.user_role() = 'collecteur'
    AND collecteur_id = auth.uid()
  );

CREATE POLICY "anomalies_select_client"
  ON public.anomalies FOR SELECT
  USING (
    public.user_role() = 'client'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "anomalies_select_chef_centre"
  ON public.anomalies FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND demande_id IN (
      SELECT id FROM public.demandes WHERE centre_id = public.user_centre_id()
    )
  );

CREATE POLICY "anomalies_select_admin"
  ON public.anomalies FOR SELECT
  USING (public.user_role() IN ('admin','superviseur'));

CREATE POLICY "anomalies_insert_collecteur"
  ON public.anomalies FOR INSERT
  WITH CHECK (
    public.user_role() = 'collecteur'
    AND collecteur_id = auth.uid()
  );

CREATE POLICY "anomalies_update_chef_centre_admin"
  ON public.anomalies FOR UPDATE
  USING (public.user_role() IN ('chef_centre','admin'));

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (destinataire_id = auth.uid());

-- Marquer comme lue
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (destinataire_id = auth.uid())
  WITH CHECK (destinataire_id = auth.uid());

CREATE POLICY "notifications_insert_ops"
  ON public.notifications FOR INSERT
  WITH CHECK (public.user_role() IN ('client','collecteur','chef_centre','admin'));

-- ------------------------------------------------------------
-- AUDIT_LOG
-- ------------------------------------------------------------

CREATE POLICY "audit_log_select_admin"
  ON public.audit_log FOR SELECT
  USING (public.user_role() = 'admin');

CREATE POLICY "audit_log_insert_authenticated"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- DEPOTS
-- ------------------------------------------------------------

CREATE POLICY "depots_select_collecteur"
  ON public.depots FOR SELECT
  USING (
    public.user_role() = 'collecteur'
    AND collecteur_id = auth.uid()
  );

CREATE POLICY "depots_select_chef_centre"
  ON public.depots FOR SELECT
  USING (
    public.user_role() = 'chef_centre'
    AND centre_id = public.user_centre_id()
  );

CREATE POLICY "depots_select_admin"
  ON public.depots FOR SELECT
  USING (public.user_role() IN ('admin','superviseur'));

CREATE POLICY "depots_insert_collecteur"
  ON public.depots FOR INSERT
  WITH CHECK (
    public.user_role() = 'collecteur'
    AND collecteur_id = auth.uid()
  );

CREATE POLICY "depots_update_chef_centre_admin"
  ON public.depots FOR UPDATE
  USING (
    public.user_role() IN ('chef_centre','admin')
    AND (public.user_role() = 'admin' OR centre_id = public.user_centre_id())
  );

-- ------------------------------------------------------------
-- BAREMES_TARIFAIRES
-- ------------------------------------------------------------

CREATE POLICY "baremes_select_authenticated"
  ON public.baremes_tarifaires FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "baremes_all_admin"
  ON public.baremes_tarifaires FOR ALL
  USING (public.user_role() = 'admin');

-- ------------------------------------------------------------
-- TYPES_ANOMALIES
-- ------------------------------------------------------------

CREATE POLICY "types_anomalies_select_authenticated"
  ON public.types_anomalies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "types_anomalies_all_admin"
  ON public.types_anomalies FOR ALL
  USING (public.user_role() = 'admin');


-- ============================================================
-- 6. SEED — DONNÉES DE DÉMO (sans comptes utilisateurs)
-- ============================================================

-- ------------------------------------------------------------
-- Centres de démo
-- ------------------------------------------------------------

INSERT INTO public.centres (id, nom, ville, adresse, latitude, longitude, actif)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Centre Casablanca Maarif',
    'Casablanca',
    'Rue Abou Bakr Seddiq, Maarif, Casablanca',
    33.5731, -7.6120,
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Centre Casablanca Ain Diab',
    'Casablanca',
    'Boulevard de la Corniche, Ain Diab, Casablanca',
    33.5950, -7.6760,
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Centre Rabat Agdal',
    'Rabat',
    'Avenue Al Jazair, Agdal, Rabat',
    33.9980, -6.8500,
    true
  )
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- Barème tarifaire simplifié (démo)
-- 4 routes × 3 tranches de poids
-- ------------------------------------------------------------

INSERT INTO public.baremes_tarifaires
  (ville_origine, ville_destination, poids_min_kg, poids_max_kg, tarif_ht, version, actif)
VALUES
  -- Casablanca → Casablanca
  ('Casablanca', 'Casablanca',  0.000,  5.000,  30.00, 1, true),
  ('Casablanca', 'Casablanca',  5.001, 15.000,  50.00, 1, true),
  ('Casablanca', 'Casablanca', 15.001, 30.000,  80.00, 1, true),
  -- Casablanca → Rabat
  ('Casablanca', 'Rabat',       0.000,  5.000,  45.00, 1, true),
  ('Casablanca', 'Rabat',       5.001, 15.000,  70.00, 1, true),
  ('Casablanca', 'Rabat',      15.001, 30.000, 110.00, 1, true),
  -- Rabat → Casablanca
  ('Rabat',      'Casablanca',  0.000,  5.000,  45.00, 1, true),
  ('Rabat',      'Casablanca',  5.001, 15.000,  70.00, 1, true),
  ('Rabat',      'Casablanca', 15.001, 30.000, 110.00, 1, true),
  -- Rabat → Rabat
  ('Rabat',      'Rabat',       0.000,  5.000,  30.00, 1, true),
  ('Rabat',      'Rabat',       5.001, 15.000,  50.00, 1, true),
  ('Rabat',      'Rabat',      15.001, 30.000,  80.00, 1, true)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- Types d'anomalies
-- ------------------------------------------------------------

INSERT INTO public.types_anomalies (libelle, actif)
VALUES
  ('Colis endommagé',                   true),
  ('Colis introuvable à l''adresse',    true),
  ('Destinataire absent',               true),
  ('Adresse incorrecte ou incomplète',  true),
  ('Colis refusé par le destinataire',  true),
  ('Poids ou dimensions non conformes', true),
  ('Accès impossible (gardien, code)',  true),
  ('Autre',                             true)
ON CONFLICT DO NOTHING;


-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
-- Étape suivante : créer les comptes de démo.
-- Suivre le guide : supabase/seed-auth.md
-- ============================================================
