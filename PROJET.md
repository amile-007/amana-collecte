# PROJET.md — Application AMANA Collecte
> **Fichier de référence Claude Code — À lire intégralement avant chaque session**
> Mis à jour : Mars 2026 | Version : MVP Option A Scalable

---

## 1. CONTEXTE ET OBJECTIF

**Projet :** Application digitale de collecte de colis — Service AMANA de BARID AL MAGHRIB (Poste Maroc)

**Objectif immédiat :** Livrer un MVP démonstratif fonctionnel en 2 semaines pour valider le concept auprès de BARID AL MAGHRIB.

**Objectif final :** L'architecture et le code doivent être **scalables** — conçus dès le départ pour accueillir les fonctionnalités avancées (Option B) sans réécriture majeure.

**Ce que l'application couvre :**
La solution digitalise le premier maillon de l'activité AMANA : la collecte de colis. Elle couvre deux variantes opérationnelles :
- **Inter-ville** : collecte au domicile client → dépôt au centre → injection réseau BARID AL MAGHRIB
- **Intra-ville** : collecte + livraison directe au destinataire final dans la même agglomération

---

## 2. STACK TECHNIQUE (NE PAS MODIFIER SANS VALIDATION)

```
Frontend web    : Next.js 14 (App Router) + TypeScript + Tailwind CSS
Application mobile : React Native + Expo (SDK 51)
Base de données : Supabase (PostgreSQL) + Supabase Realtime
Authentification : Supabase Auth (email + OTP)
Cartes          : Leaflet.js + OpenStreetMap (web) / React Native Maps (mobile)
PDF             : react-pdf / @react-pdf/renderer
QR Code         : qrcode.react (génération) + expo-camera (scan mobile)
Hébergement web : Vercel (déploiement automatique via Git)
Hébergement mobile : Expo Go (démo) → EAS Build (production future)
Versionning     : Git + GitHub
```

**Langue de l'interface :** Français uniquement (MVP)
**Zone géographique de démo :** Casablanca + Rabat (adresses réelles)

---

## 3. ARCHITECTURE SCALABLE — PRINCIPES FONDAMENTAUX

> Ces principes garantissent que l'Option B (fonctionnalités avancées) s'ajoutera sans réécriture.

### 3.1 Structure des dossiers (Next.js)
```
/app
  /(auth)           → pages inscription, connexion, OTP
  /(client)         → portail client externe
  /(backoffice)     → back-office chef de centre
  /(admin)          → administration système
/components
  /ui               → composants génériques réutilisables
  /maps             → composants carte (Leaflet)
  /forms            → formulaires
/lib
  /supabase         → client Supabase + helpers
  /utils            → fonctions utilitaires (calcul volumétrique, tarification...)
  /types            → tous les types TypeScript (interfaces métier)
/hooks              → hooks React personnalisés
/services           → logique métier découplée des composants
```

### 3.2 Règles de code impératives
- **TypeScript strict** : toutes les entités métier ont une interface typée dans `/lib/types`
- **Row Level Security (RLS)** activé sur toutes les tables Supabase dès le départ
- **Séparation services/composants** : la logique métier ne vit pas dans les composants React
- **Variables d'environnement** : aucune clé API en dur dans le code, tout dans `.env.local`
- **Commentaires** : chaque fonction métier complexe est commentée en français

---

## 4. MODÈLE DE DONNÉES — BASE SUPABASE

> Schéma complet pensé pour l'Option B. Les colonnes marquées `/* option_b */` ne sont pas utilisées dans le MVP mais sont présentes dans la structure.

### Table : `profiles` (extension de auth.users)
```sql
id              uuid PRIMARY KEY references auth.users
role            text CHECK (role IN ('client','collecteur','chef_centre','admin','superviseur'))
nom             text
prenom          text
telephone       text
centre_id       uuid references centres(id)   /* option_b: rattachement centre */
crm_id          text                           /* option_b: rattachement CRM BAM */
crbt_enabled    boolean DEFAULT false          /* option_b: activation CRBT */
actif           boolean DEFAULT true
created_at      timestamptz DEFAULT now()
```

### Table : `centres`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
nom             text
ville           text
adresse         text
latitude        float
longitude       float
actif           boolean DEFAULT true
```

### Table : `collecteurs` (vue étendue des profiles role='collecteur')
```sql
id              uuid PRIMARY KEY references profiles(id)
centre_id       uuid references centres(id)
zone_intervention text
capacite_max_kg float
statut          text CHECK (statut IN ('disponible','en_mission','indisponible'))
position_lat    float    /* mis à jour en temps réel depuis l'app mobile */
position_lng    float    /* mis à jour en temps réel depuis l'app mobile */
position_updated_at timestamptz
```

### Table : `demandes`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
reference       text UNIQUE  /* format : AMD-YYYYMMDD-XXXX */
client_id       uuid references profiles(id)
collecteur_id   uuid references collecteurs(id)
centre_id       uuid references centres(id)
type_variante   text CHECK (type_variante IN ('inter_ville','intra_ville'))
statut          text CHECK (statut IN (
                  'en_attente','affectee','en_cours','collectee',
                  'en_transit','livree','deposee_centre',
                  'en_instance','retournee','anomalie','annulee'))
adresse_collecte_texte  text
adresse_collecte_lat    float
adresse_collecte_lng    float
montant_total   numeric(10,2)
mode_paiement   text CHECK (mode_paiement IN ('en_ligne','especes')) /* option_b: en_ligne */
paiement_statut text CHECK (paiement_statut IN ('en_attente','confirme','echoue'))
notes           text
qr_code_data    text    /* données encodées dans le QR code */
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### Table : `colis`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
demande_id      uuid references demandes(id)
reference       text UNIQUE
destination_ville     text
destinataire_nom      text
destinataire_telephone text
destinataire_adresse  text
destinataire_lat      float
destinataire_lng      float
poids_declare   numeric(8,3)   /* kg */
longueur        numeric(8,2)   /* cm */
largeur         numeric(8,2)   /* cm */
hauteur         numeric(8,2)   /* cm */
poids_volumetrique  numeric(8,3) GENERATED ALWAYS AS (longueur * largeur * hauteur / 3000) STORED
poids_reference     numeric(8,3) GENERATED ALWAYS AS (GREATEST(poids_declare, longueur * largeur * hauteur / 3000)) STORED
tarif_unitaire  numeric(10,2)
poids_constate  numeric(8,3)   /* option_b: taxation au dépôt */
tarif_ajuste    numeric(10,2)  /* option_b: recalcul tarifaire */
crbt_montant    numeric(10,2)  /* option_b: CRBT */
crbt_encaisse   boolean DEFAULT false /* option_b */
statut          text
created_at      timestamptz DEFAULT now()
```

### Table : `statuts_historique`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
demande_id      uuid references demandes(id)
statut_avant    text
statut_apres    text
acteur_id       uuid references profiles(id)
acteur_role     text
commentaire     text
created_at      timestamptz DEFAULT now()
```

### Table : `anomalies`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
demande_id      uuid references demandes(id)
collecteur_id   uuid references collecteurs(id)
type_anomalie   text  /* references table types_anomalies */
commentaire     text
photo_urls      text[]  /* tableau d'URLs Supabase Storage */
statut_traitement text CHECK (statut_traitement IN ('ouverte','en_cours','resolue'))
created_at      timestamptz DEFAULT now()
```

### Table : `types_anomalies` (administrable)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
libelle         text
actif           boolean DEFAULT true
```

### Table : `baremes_tarifaires` (administrable)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
ville_origine   text
ville_destination text
poids_min_kg    numeric(8,3)
poids_max_kg    numeric(8,3)
tarif_ht        numeric(10,2)
version         integer
actif           boolean DEFAULT true
date_application timestamptz DEFAULT now()
```

### Table : `notifications` (in-app)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
destinataire_id uuid references profiles(id)
type_evenement  text
titre           text
message         text
demande_id      uuid references demandes(id)
lu              boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### Table : `audit_log`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
acteur_id       uuid references profiles(id)
action          text
entite          text
entite_id       uuid
valeur_avant    jsonb
valeur_apres    jsonb
ip_address      text
created_at      timestamptz DEFAULT now()
```

### Table : `depots` (option_b — structure présente, non utilisée MVP)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
collecteur_id   uuid references collecteurs(id)
centre_id       uuid references centres(id)
statut          text CHECK (statut IN ('en_attente','valide','rejete'))
montant_especes_attendu  numeric(10,2)
montant_especes_verse    numeric(10,2)
validated_by    uuid references profiles(id)
created_at      timestamptz DEFAULT now()
```

---

## 5. PÉRIMÈTRE MVP — CE QUI EST DANS LE SCOPE

### ✅ MODULE 1 — Portail client
- Inscription + connexion email/mot de passe + activation OTP
- Saisie adresse de collecte sur carte interactive (Leaflet + OpenStreetMap)
- Création demande multi-colis (poids, dimensions, calcul volumétrique automatique)
- Tarif fixe par défaut pour la démo (barème simplifié Casablanca/Rabat)
- Génération étiquette PDF téléchargeable + QR code par colis
- Historique des demandes avec filtres (statut, date, référence) + chronologie
- Suivi GPS du collecteur sur carte en temps réel (intra-ville, dès confirmation collecte)
- Notifications in-app à chaque changement de statut
- Service CRBT (déclaration du montant à encaisser)

### ✅ MODULE 2 — Back-office Chef de centre
- Tableau de bord temps réel (demandes en attente, collecteurs dispos, taux complétion, anomalies)
- Vue cartographique missions du jour (demandes + positions collecteurs)
- Affectation des missions (suggestions basées sur proximité géographique)
- Gestion des anomalies (réception, réaffectation, annulation)
- Validation des dépôts collecteurs + génération récépissé PDF
- Saisie poids constaté + recalcul tarifaire au dépôt

### ✅ MODULE 3 — Application mobile collecteur (React Native / Expo)
- Liste des missions affectées avec statuts
- Carte des adresses de collecte et livraison
- Scan QR code + code-barres (confirmation collecte)
- Déclaration anomalie avec photo obligatoire
- Passation simplifiée entre collecteurs (scan simple)
- Preuve de livraison (signature électronique + photo)
- Envoi position GPS en temps réel (toutes les 10 secondes)
- Notifications push (nouvelle mission, réaffectation, annulation)

### ✅ MODULE 4 — Administration
- Référentiel tarifaire administrable (grille origine/destination/poids/tarif)
- Gestion utilisateurs basique (activer/désactiver, changer rôle)
- Journal d'audit (toutes actions sensibles tracées)
- Tableaux de bord KPIs (volumes, anomalies, délais, performance collecteurs)

---

## 6. HORS SCOPE MVP — PRÉVU OPTION B

> Ces fonctionnalités sont dans le CdC final mais **pas dans le MVP**. L'architecture les anticipe.

- ❌ Paiement en ligne (passerelle sécurisée)
- ❌ Rattachement CRM BARID AL MAGHRIB
- ❌ Mode hors connexion mobile (offline sync)
- ❌ Interface client interne sites de vente AMANA
- ❌ Passation double scan entre collecteurs
- ❌ Notifications SMS / Email / WhatsApp
- ❌ Intégration API SICOM (système de caisse BARID AL MAGHRIB)
- ❌ Intégration SI central (suivi livraison réseau inter-ville)
- ❌ Moteur d'optimisation externe (algorithme de tournées avancé)
- ❌ Interface bilingue Arabe/Français
- ❌ Superviseur central (accès lecture tous centres)

---

## 7. RÔLES ET DROITS D'ACCÈS

| Rôle | Accès |
|------|-------|
| `client` | Portail client : créer demande, suivre, historique |
| `collecteur` | App mobile : missions, scan, anomalies, livraison |
| `chef_centre` | Back-office : supervision, affectation, dépôts |
| `admin` | Administration complète : référentiels, utilisateurs, audit |
| `superviseur` | Lecture seule tous centres (option B) |

**RLS Supabase :** Chaque rôle ne voit que ses données. Un collecteur ne voit que ses missions. Un chef de centre ne voit que son centre.

---

## 8. RÈGLES MÉTIER CLÉS (extraites du CdC)

### Calcul volumétrique
```
poids_volumetrique = (longueur × largeur × hauteur) / 3000
poids_reference = MAX(poids_declare, poids_volumetrique)
tarif = barème[ville_origine][ville_destination][tranche_poids_reference]
```

### Cycle de vie d'une demande
```
en_attente → affectee → en_cours → collectee → livree (intra-ville)
                                              → deposee_centre (inter-ville)
                                              → en_instance (non-livraison intra-ville)
                                   → anomalie → en_attente (réaffectation)
Tout statut → annulee (si pas encore collectée)
en_instance → retournee (délai expiré)
```

### Référence demande
```
Format : AMD-YYYYMMDD-XXXX (ex: AMD-20260315-0042)
Générée automatiquement à la validation
```

### Suivi GPS temps réel
```
- Déclenchement : dès que statut demande = 'collectee' (intra-ville uniquement)
- Fréquence envoi position : toutes les 10 secondes depuis l'app mobile
- Canal : Supabase Realtime sur table collecteurs (position_lat, position_lng)
- Arrêt : statut = 'livree' ou 'en_instance'
```

### Notifications in-app
```
Événements déclencheurs :
- Demande créée → client notifié
- Demande affectée → client notifié
- Mission démarrée (en_cours) → client notifié
- Collecte confirmée → client notifié + suivi carte activé (intra-ville)
- Anomalie déclarée → client + chef_centre notifiés
- Dépôt validé → client notifié
- Livraison confirmée → client notifié
- Nouvelle mission affectée → collecteur notifié (push)
- Réaffectation → collecteur ancien + nouveau notifiés
```

---

## 9. DONNÉES DE DÉMO

### Comptes de test
```
CLIENT      : client@demo.ma        / Demo2026!
COLLECTEUR 1: collecteur1@demo.ma   / Demo2026!  (zone Casablanca Centre)
COLLECTEUR 2: collecteur2@demo.ma   / Demo2026!  (zone Casablanca Ain Diab)
COLLECTEUR 3: collecteur3@demo.ma   / Demo2026!  (zone Rabat Agdal)
CHEF CENTRE : chef@demo.ma          / Demo2026!
ADMIN       : admin@demo.ma         / Demo2026!
```

### Centres de démo
```
Centre Casablanca Maarif  — Rue Abou Bakr Seddiq, Casablanca
Centre Casablanca Ain Diab — Bd de la Corniche, Casablanca
Centre Rabat Agdal         — Avenue Al Jazair, Rabat
```

### Barème tarifaire simplifié (démo)
```
Casablanca → Casablanca : 0-5kg = 30 MAD | 5-15kg = 50 MAD | 15-30kg = 80 MAD
Casablanca → Rabat      : 0-5kg = 45 MAD | 5-15kg = 70 MAD | 15-30kg = 110 MAD
Rabat → Casablanca      : 0-5kg = 45 MAD | 5-15kg = 70 MAD | 15-30kg = 110 MAD
Rabat → Rabat           : 0-5kg = 30 MAD | 5-15kg = 50 MAD | 15-30kg = 80 MAD
```

### Scénario de démo principal (à jouer en live — 10 minutes)
```
1. [CLIENT]       Créer une demande intra-ville Casablanca (2 colis)
2. [CHEF CENTRE]  Voir la demande dans le tableau de bord + affecter au Collecteur 1
3. [COLLECTEUR 1] Recevoir la mission sur mobile + démarrer
4. [COLLECTEUR 1] Scanner le QR code de la demande + confirmer les 2 colis
5. [CLIENT]       Voir le collecteur se déplacer sur la carte en temps réel
6. [COLLECTEUR 1] Livrer + recueillir signature + photo
7. [CLIENT]       Voir statut passer à "Livrée" + notification in-app
8. [CHEF CENTRE]  Valider le dépôt de fin de journée + générer récépissé PDF
9. [ADMIN]        Consulter les KPIs du jour dans le tableau de bord analytique
```

---

## 10. ÉTAT D'AVANCEMENT

> **Mettre à jour cette section à la fin de chaque session de travail**

| Module | Statut | Dernière mise à jour | Notes |
|--------|--------|---------------------|-------|
| Phase 0 — Installation | ⬜ À faire | — | Node.js, Claude Code, VS Code, Git, Supabase |
| Schéma base de données | ✅ Terminé | 2026-04-06 | Toutes les tables créées dans Supabase |
| Authentification | ✅ Terminé | 2026-04-06 | Next.js 16.2.2 + Turbopack + Supabase Auth opérationnels |
| Module 1 — Portail client | ✅ Terminé | 2026-04-06 | Dashboard, création demande, historique+GPS, notifications temps réel |
| Module 2 — Back-office | ✅ Terminé | 2026-04-07 | Dashboard KPIs, demandes+affectation, carte GPS, collecteurs, dépôts, anomalies |
| Module 3 — App mobile | ✅ Terminé | 2026-04-11 | Flux intra-ville complet : livraison, non-livraison, mise en instance, scan QR, anomalie+photo |
| Module 4 — Temps réel GPS | ✅ Terminé | 2026-04-11 | SuiviGPS Realtime (client), envoi GPS 10s (collecteur web) |
| Module 5 — Administration | ✅ Terminé | 2026-04-11 | Dashboard KPIs, barèmes tarifaires, utilisateurs, journal audit |
| Données de démo | ✅ Terminé | 2026-04-09 | AMD-DEMO-0001 opérationnel — seed-demo.sql validé |
| Déploiement Vercel | ✅ Terminé | 2026-04-11 | https://amana-collecte.vercel.app opérationnel |
| Tests scénario démo | 🔄 À faire | 2026-04-11 | |

**Légende :** ⬜ À faire | 🔄 En cours | ✅ Terminé | ❌ Bloqué

---

## 11. VARIABLES D'ENVIRONNEMENT REQUISES

> Créer le fichier `.env.local` à la racine du projet Next.js avec ces variables.
> Ne jamais committer ce fichier (il est dans .gitignore).

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=AMANA Collecte

# Optionnel — Option B futur
# SMTP_HOST=
# SMTP_PORT=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
```

---

## 12. INSTRUCTIONS POUR CLAUDE CODE

**Au début de chaque session, dis à Claude Code :**
> "Lis le fichier PROJET.md et dis-moi l'état d'avancement actuel. Ensuite nous allons travailler sur [MODULE]."

**Après chaque tâche réussie :**
> "Fais un commit Git avec le message : [description de ce qui a été fait]"

**En cas de bug :**
> "Dans le fichier [nom], la fonction [description] produit [comportement observé] au lieu de [comportement attendu]. Corrige sans modifier le reste."

**Règle absolue :**
Ne jamais modifier le code manuellement dans VS Code.
Toujours passer par Claude Code pour toute modification.
