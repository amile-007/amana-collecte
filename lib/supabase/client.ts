import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase côté navigateur (composants client React).
 * À utiliser dans les fichiers avec 'use client'.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
