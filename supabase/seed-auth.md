# Guide — Création des comptes de démo AMANA

Ce guide explique comment créer les 6 comptes de démo définis dans la section 9 de `PROJET.md`,
puis insérer les profils métier et données collecteurs associés.

---

## Étape 1 — Créer les utilisateurs dans le dashboard Supabase

1. Ouvrir le dashboard : **Authentication → Users → Add user → Create new user**
2. Cocher **"Auto Confirm User"** pour éviter la validation par email en démo
3. Créer les 6 comptes suivants dans cet ordre :

| # | Email | Mot de passe | Rôle métier |
|---|-------|-------------|-------------|
| 1 | `client@demo.ma` | `Demo2026!` | client |
| 2 | `collecteur1@demo.ma` | `Demo2026!` | collecteur (Casablanca Maarif) |
| 3 | `collecteur2@demo.ma` | `Demo2026!` | collecteur (Casablanca Ain Diab) |
| 4 | `collecteur3@demo.ma` | `Demo2026!` | collecteur (Rabat Agdal) |
| 5 | `chef@demo.ma` | `Demo2026!` | chef_centre (Casablanca Maarif) |
| 6 | `admin@demo.ma` | `Demo2026!` | admin |

---

## Étape 2 — Récupérer les UUID générés

Après création, Supabase génère un UUID pour chaque utilisateur.

1. Aller dans **Authentication → Users**
2. Cliquer sur chaque utilisateur pour voir son UUID
3. Renseigner le tableau ci-dessous (colonne "UUID à copier") :

| Email | UUID à copier |
|-------|---------------|
| `client@demo.ma` | bf3b556d-85d7-411c-99ab-403a8236f869 |
| `collecteur1@demo.ma` | f4a51a10-1375-4213-aa14-6c7a26d56c3b |
| `collecteur2@demo.ma` | 048974ac-9fbe-4db4-af20-3c16bf76fa0e |
| `collecteur3@demo.ma` | 4da0e79f-6e0c-4026-9775-6f5c676e6073 |
| `chef@demo.ma` | 477c60cc-069a-4cbf-847e-db23a07dd2b5 |
| `admin@demo.ma` | 7db0a25f-2198-468a-a45a-d4dff738f9eb |

---

## Étape 3 — Exécuter le script SQL de seed

Ouvrir le **SQL Editor** du dashboard Supabase.

Remplacer chaque `REMPLACER_PAR_UUID_...` par les UUID copiés à l'étape 2,
puis exécuter le script complet.

```sql
-- ============================================================
-- AMANA Collecte — Seed comptes de démo
-- Remplacer les 6 UUID avant d'exécuter
-- ============================================================

-- UUIDs à renseigner (copier depuis Authentication → Users)
DO $$
DECLARE
  uuid_client       uuid := 'REMPLACER_PAR_UUID_client@demo.ma';
  uuid_collecteur1  uuid := 'REMPLACER_PAR_UUID_collecteur1@demo.ma';
  uuid_collecteur2  uuid := 'REMPLACER_PAR_UUID_collecteur2@demo.ma';
  uuid_collecteur3  uuid := 'REMPLACER_PAR_UUID_collecteur3@demo.ma';
  uuid_chef         uuid := 'REMPLACER_PAR_UUID_chef@demo.ma';
  uuid_admin        uuid := 'REMPLACER_PAR_UUID_admin@demo.ma';

  -- IDs des centres créés par schema.sql (fixes)
  centre_casa_maarif   uuid := 'b0000000-0000-0000-0000-000000000001';
  centre_casa_ain_diab uuid := 'b0000000-0000-0000-0000-000000000002';
  centre_rabat_agdal   uuid := 'b0000000-0000-0000-0000-000000000003';

BEGIN

  -- ----------------------------------------------------------
  -- Profils métier
  -- ----------------------------------------------------------
  INSERT INTO public.profiles (id, role, nom, prenom, telephone, centre_id, actif)
  VALUES
    (uuid_client,      'client',      'Alaoui',  'Karim',  '+212600000001', NULL,                 true),
    (uuid_collecteur1, 'collecteur',  'Benali',  'Youssef','+212600000002', centre_casa_maarif,   true),
    (uuid_collecteur2, 'collecteur',  'Chraibi', 'Mehdi',  '+212600000003', centre_casa_ain_diab, true),
    (uuid_collecteur3, 'collecteur',  'Tazi',    'Omar',   '+212600000004', centre_rabat_agdal,   true),
    (uuid_chef,        'chef_centre', 'Fassi',   'Nadia',  '+212600000005', centre_casa_maarif,   true),
    (uuid_admin,       'admin',       'Rami',    'Samir',  '+212600000006', NULL,                 true)
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Données opérationnelles collecteurs
  -- ----------------------------------------------------------
  INSERT INTO public.collecteurs (id, centre_id, zone_intervention, capacite_max_kg, statut)
  VALUES
    (
      uuid_collecteur1,
      centre_casa_maarif,
      'Casablanca Centre — Maarif, Gauthier, Racine',
      50.0,
      'disponible'
    ),
    (
      uuid_collecteur2,
      centre_casa_ain_diab,
      'Casablanca Ain Diab — Corniche, Anfa, CIL',
      50.0,
      'disponible'
    ),
    (
      uuid_collecteur3,
      centre_rabat_agdal,
      'Rabat Agdal — Hassan, Hay Riad, Aviation',
      50.0,
      'disponible'
    )
  ON CONFLICT (id) DO NOTHING;

END $$;
```

---

## Vérification

Après exécution, vérifier dans **Table Editor** :

- Table `profiles` → 6 lignes avec les bons rôles
- Table `collecteurs` → 3 lignes (un par collecteur)

Pour tester la connexion, aller sur `http://localhost:3000/auth/login`
et se connecter avec `client@demo.ma` / `Demo2026!`.
