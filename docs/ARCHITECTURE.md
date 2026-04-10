# AMANA Collecte — Architecture Technique

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Portail      │  │ Back-office  │  │ Interface            │  │
│  │ Client       │  │ Chef centre  │  │ Collecteur (mobile)  │  │
│  │ /dashboard   │  │ /backoffice  │  │ /collecteur/*        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Next.js 16.2.2   │
                    │   proxy.ts         │  ← Auth guard + perf log
                    │   (Middleware)     │
                    └─────────┬──────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Server       │ │ API Routes   │ │ Server       │
    │ Components   │ │ /api/*       │ │ Actions      │
    │ (données     │ │ (REST +      │ │ (mutations)  │
    │  fraîches)   │ │  validation) │ │              │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           └────────────────┼────────────────┘
                            ▼
                  ┌──────────────────┐
                  │    Supabase      │
                  │  PostgreSQL +    │
                  │  Auth + RLS +    │
                  │  Realtime        │
                  └──────────────────┘
```

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js | 16.2.2 |
| Base de données | Supabase (PostgreSQL 15) | — |
| Auth | Supabase Auth (JWT) | — |
| Styles | Tailwind CSS | 4.x |
| État client | Zustand | latest |
| Validation | Zod | latest |
| Cartes | Leaflet + react-leaflet | 1.9.4 / 5.0 |
| Hébergement | Vercel | — |

---

## Conventions de code

### Server vs Client Components

```
Règle 1 : Tout composant qui LIT des données = Server Component (async)
Règle 2 : Tout composant avec état UI = Client Component ('use client')
Règle 3 : Pattern Shell+Content :
  - Shell (client) = layout, navigation, état UI
  - Content (server) = données fraîches à chaque requête
```

### Arborescence des modules

```
lib/
  cache/index.ts       ← Wrapper unstable_cache + TTL constants
  db/
    queries.ts         ← Toutes les lectures Supabase
    mutations.ts       ← Toutes les écritures Supabase
  schemas/index.ts     ← Schémas Zod (validation entrées)
  stores/              ← Zustand stores (état client)
    auth.store.ts
    demande.store.ts   ← Formulaire multi-étapes (persisté localStorage)
    notifications.store.ts
  logger.ts            ← Logger JSON structuré
  ratelimit.ts         ← Rate limiting (in-memory / Upstash en prod)
  types/index.ts       ← Types TypeScript partagés

components/
  shared/              ← Composants partagés entre portails
    StatusBadge.tsx    ← Badge statut universel
    Timeline.tsx       ← Historique statuts
    MapWrapper.tsx     ← Wrapper Leaflet générique
    NotificationBell.tsx
  client/              ← Portail client spécifique
  backoffice/          ← Back-office spécifique
  collecteur/          ← Interface collecteur spécifique
  ui/                  ← Primitives (Button, Input, Card)

app/
  (auth)/              ← Routes publiques (login, register…)
  (client)/            ← Portail client (layout avec auth guard)
  backoffice/          ← Back-office chef_centre
  collecteur/          ← Interface collecteur mobile
  api/                 ← API Routes REST
    demandes/          ← GET avec pagination cursor
    collecteurs/
      position/        ← POST mise à jour GPS
    notifications/     ← GET paginé + PATCH batch read
    tarifs/
      calculate/       ← POST calcul tarif (cache 1h)

supabase/
  schema.sql           ← Schéma complet (tables, triggers, RLS)
  indexes.sql          ← Index de performance (CONCURRENTLY)
  views.sql            ← Vues matérialisées KPIs
  seed-demo.sql        ← Données de démo
```

---

## Cache Strategy

| Données | TTL | Tag d'invalidation |
|---------|-----|--------------------|
| Positions GPS collecteurs | pas de cache | — |
| Statuts demandes | 30s | `demande-{id}`, `demandes-client-{id}` |
| Profils utilisateurs | 5 min | `profile-{userId}` |
| KPIs centre | 5 min | `kpis-{centreId}` |
| Barèmes tarifaires | 1h | `tarifs` |

Invalidation ciblée dans `lib/cache/index.ts` :
```ts
invalidateDemande(demandeId, clientId, centreId)
invalidateProfile(userId)
invalidateCollecteurs(centreId)
```

---

## Sécurité

### RLS Supabase
Toutes les tables ont Row Level Security activé. Les policies sont définies dans `supabase/schema.sql`. Aucune donnée n'est accessible sans authentification valide.

### Rate Limiting
Implémenté dans `lib/ratelimit.ts` :
- Login : 5 req/min
- Création demande : 10 req/min  
- Mise à jour position GPS : 1 req/5s

**En production** : remplacer l'implémentation in-memory par Upstash Redis.

### Validation
Toutes les entrées utilisateur sont validées avec Zod (`lib/schemas/index.ts`) avant traitement.

---

## Déploiement

### Variables d'environnement requises (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://amana-collecte.vercel.app
```

### Procédure de déploiement

```bash
# 1. Build local
npm run build

# 2. Déploiement production
vercel --prod

# 3. Vérification
vercel env ls production
```

### Indexes Supabase (une seule fois)
Exécuter `supabase/indexes.sql` dans le SQL Editor de Supabase.

### Vues matérialisées (optionnel, nécessite pg_cron)
1. Activer pg_cron dans Supabase Dashboard → Database → Extensions
2. Exécuter `supabase/views.sql`
3. Décommenter et exécuter le job `cron.schedule` en bas du fichier

---

## Monitoring

### Logs Vercel
Tous les logs sont en JSON structuré. Filtrables par `level`, `path`, `user`.

Alerte automatique si une requête dépasse **3 secondes** (CT-007 du CdC) :
```json
{"level":"warn","msg":"Slow proxy response","path":"/backoffice","elapsed_ms":4200}
```

### Sentry (recommandé pour la V2)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Nécessite un compte sur sentry.io.

---

## V2 — Roadmap technique

- [ ] Remplacer rate limiter in-memory → Upstash Redis
- [ ] Ajouter Sentry error tracking
- [ ] Activer vue matérialisée KPIs + pg_cron
- [ ] WebSocket Realtime pour positions GPS collecteurs
- [ ] PWA (manifest + service worker) pour l'interface collecteur
- [ ] Tests E2E avec Playwright
