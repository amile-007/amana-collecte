// ─── Rate Limiting ────────────────────────────────────────────────────────────
//
// Utilise Upstash Redis si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// sont configurés → distribué, survit aux redémarrages Vercel.
// Sinon → fallback in-memory (dev local, CI, ou Upstash non configuré).
//
// Pour activer Upstash :
//   1. Créer un compte sur upstash.com → New Database → Redis
//   2. Copier REST URL et REST Token dans les variables Vercel :
//      vercel env add UPSTASH_REDIS_REST_URL production
//      vercel env add UPSTASH_REDIS_REST_TOKEN production

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Fallback in-memory ───────────────────────────────────────────────────────

interface RateWindow { count: number; resetAt: number }
const store = new Map<string, RateWindow>()

function inMemoryCheck(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const w = store.get(key)
  if (!w || now > w.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (w.count >= max) return false
  w.count++
  return true
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, w] of store) if (now > w.resetAt) store.delete(k)
  }, 60_000)
}

// ─── Upstash ou fallback ──────────────────────────────────────────────────────

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

let loginLimiter:    Ratelimit | null = null
let demandeLimiter:  Ratelimit | null = null
let positionLimiter: Ratelimit | null = null

if (hasUpstash) {
  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  loginLimiter    = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '1 m'),  prefix: 'rl:login' })
  demandeLimiter  = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'),  prefix: 'rl:demande' })
  positionLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1,  '5 s'),  prefix: 'rl:position' })
}

async function check(
  limiter: Ratelimit | null,
  identifier: string,
  fallbackMax: number,
  fallbackWindowMs: number
): Promise<boolean> {
  if (limiter) {
    const { success } = await limiter.limit(identifier)
    return success
  }
  return inMemoryCheck(identifier, fallbackMax, fallbackWindowMs)
}

// ─── Interface publique ───────────────────────────────────────────────────────

export const rateLimits = {
  /** Login : 5 tentatives / minute */
  login: (identifier: string): Promise<boolean> =>
    check(loginLimiter, `login:${identifier}`, 5, 60_000),

  /** Création demande : 10 / minute */
  createDemande: (userId: string): Promise<boolean> =>
    check(demandeLimiter, `demande:${userId}`, 10, 60_000),

  /** Mise à jour position GPS : 1 / 5 secondes */
  updatePosition: (userId: string): Promise<boolean> =>
    check(positionLimiter, `position:${userId}`, 1, 5_000),
}
