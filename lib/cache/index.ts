import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'

// ─── TTL constants (seconds) ──────────────────────────────────────────────────
export const TTL = {
  REALTIME:     0,      // positions GPS, notifications temps réel — pas de cache
  DEMANDE:      30,     // statuts des demandes
  PROFILE:      300,    // profils utilisateurs (5 min)
  REFERENTIEL:  3600,   // barèmes tarifaires, centres, types anomalies (1h)
  KPIS:         300,    // vues KPIs (5 min — rafraîchies par pg_cron côté DB)
} as const

// ─── Cache tags ───────────────────────────────────────────────────────────────
export const TAGS = {
  demandes:       (id?: string) => id ? `demande-${id}` : 'demandes',
  demandesClient: (clientId: string) => `demandes-client-${clientId}`,
  demandesCentre: (centreId: string) => `demandes-centre-${centreId}`,
  profile:        (userId: string)   => `profile-${userId}`,
  collecteurs:    (centreId: string) => `collecteurs-${centreId}`,
  notifications:  (userId: string)   => `notifications-${userId}`,
  tarifs:         'tarifs',
  kpis:           (centreId: string) => `kpis-${centreId}`,
} as const

// ─── Cache wrapper ────────────────────────────────────────────────────────────
// Thin wrapper around unstable_cache for consistent usage.
// Usage:
//   const getCachedProfile = withCache(
//     async (userId: string) => supabase.from('profiles')…,
//     (userId) => [TAGS.profile(userId)],
//     TTL.PROFILE
//   )

export function withCache<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  getTags: (...args: TArgs) => string[],
  ttl: number
) {
  return (...args: TArgs): Promise<TReturn> => {
    const tags = getTags(...args)
    const keyPrefix = tags[0] ?? 'cache'
    return unstable_cache(fn, [keyPrefix, ...args.map(String)], {
      tags,
      revalidate: ttl > 0 ? ttl : undefined,
    })(...args)
  }
}

// ─── Cache invalidation helpers ───────────────────────────────────────────────
// Next.js 16 : revalidateTag requiert un 2e argument 'max' (stale-while-revalidate)
export function invalidateDemande(demandeId: string, clientId?: string, centreId?: string) {
  revalidateTag(TAGS.demandes(demandeId), 'max')
  revalidateTag(TAGS.demandes(), 'max')
  if (clientId) revalidateTag(TAGS.demandesClient(clientId), 'max')
  if (centreId) {
    revalidateTag(TAGS.demandesCentre(centreId), 'max')
    revalidateTag(TAGS.kpis(centreId), 'max')
  }
}

export function invalidateProfile(userId: string) {
  revalidateTag(TAGS.profile(userId), 'max')
}

export function invalidateCollecteurs(centreId: string) {
  revalidateTag(TAGS.collecteurs(centreId), 'max')
  revalidateTag(TAGS.kpis(centreId), 'max')
}

export function invalidateNotifications(userId: string) {
  revalidateTag(TAGS.notifications(userId), 'max')
}
