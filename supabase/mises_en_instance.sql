-- ============================================================
-- AMANA Collecte — Table mises_en_instance
-- Colis non livrés mis en attente de retrait en agence
-- À exécuter dans Supabase SQL Editor
-- ============================================================

CREATE TABLE public.mises_en_instance (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id              uuid         REFERENCES demandes(id) ON DELETE CASCADE,
  colis_id                uuid         REFERENCES colis(id) ON DELETE CASCADE,
  agence_id               uuid         REFERENCES centres(id),
  date_mise_en_instance   timestamptz  DEFAULT now(),
  date_limite_retrait     timestamptz  DEFAULT now() + interval '15 days',
  date_retrait_effectif   timestamptz,
  statut                  text         CHECK (statut IN ('en_attente','retiree','expiree')) DEFAULT 'en_attente',
  motif_non_livraison     text,
  commentaire             text,
  photo_url               text,
  created_at              timestamptz  DEFAULT now(),
  updated_at              timestamptz  DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.mises_en_instance ENABLE ROW LEVEL SECURITY;

-- Client : voit uniquement ses propres instances
CREATE POLICY "client_voit_ses_instances" ON mises_en_instance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM demandes d
      WHERE d.id = demande_id
      AND d.client_id = auth.uid()
    )
  );

-- Chef de centre : voit les instances de son agence
CREATE POLICY "chef_centre_voit_instances_centre" ON mises_en_instance
  FOR SELECT USING (
    agence_id IN (
      SELECT centre_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Chef de centre : peut mettre à jour les instances de son agence
CREATE POLICY "chef_centre_update_instances" ON mises_en_instance
  FOR UPDATE USING (
    agence_id IN (
      SELECT centre_id FROM profiles
      WHERE id = auth.uid()
      AND role = 'chef_centre'
    )
  );

-- Collecteur : peut créer une mise en instance
CREATE POLICY "collecteur_insert_instance" ON mises_en_instance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collecteur'
    )
  );

-- Admin : accès total
CREATE POLICY "admin_all_instances" ON mises_en_instance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ─── Index ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mises_en_instance_demande
  ON mises_en_instance(demande_id);

CREATE INDEX IF NOT EXISTS idx_mises_en_instance_agence_statut
  ON mises_en_instance(agence_id, statut);

-- Index partiel : uniquement les instances en attente (pour les alertes expiration)
CREATE INDEX IF NOT EXISTS idx_mises_en_instance_date_limite
  ON mises_en_instance(date_limite_retrait) WHERE statut = 'en_attente';

-- ─── Trigger updated_at ───────────────────────────────────────────────────────

CREATE TRIGGER update_mises_en_instance_updated_at
  BEFORE UPDATE ON mises_en_instance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
