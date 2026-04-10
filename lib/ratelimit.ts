// ─── Rate Limiting (in-memory pour dev/démo) ──────────────────────────────────
//
// Pour la production avec Upstash Redis :
//   1. Créer un compte sur upstash.com
//   2. npm install @upstash/ratelimit @upstash/redis
//   3. Ajouter UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN dans Vercel env
//   4. Remplacer cette implémentation par :
//
//   import { Ratelimit } from '@upstash/ratelimit'
//   import { Redis } from '@upstash/redis'
//   const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: ... })
//   export const rateLimitLogin = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1m') })
//
// ─────────────────────────────────────────────────────────────────────────────

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

function checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (existing.count >= maxRequests) return false

  existing.count++
  return true
}

// Nettoyage périodique pour éviter les fuites mémoire
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of store.entries()) {
      if (now > win.resetAt) store.delete(key)
    }
  }, 60_000)
}

export const rateLimits = {
  /** Login : 5 tentatives / minute */
  login: (identifier: string) =>
    checkLimit(`login:${identifier}`, 5, 60_000),

  /** Création demande : 10 / minute */
  createDemande: (userId: string) =>
    checkLimit(`demande:${userId}`, 10, 60_000),

  /** Mise à jour position GPS : 1 / 5 secondes */
  updatePosition: (userId: string) =>
    checkLimit(`position:${userId}`, 1, 5_000),
}
