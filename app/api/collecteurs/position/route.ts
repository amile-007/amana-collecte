import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePosition } from '@/lib/db/mutations'
import { PositionSchema } from '@/lib/schemas'
import { rateLimits } from '@/lib/ratelimit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Rate limiting : 1 update / 5 secondes par collecteur
    if (!rateLimits.updatePosition(user.id)) {
      return NextResponse.json({ error: 'Trop de mises à jour' }, { status: 429 })
    }

    // Vérifier que l'utilisateur est bien un collecteur
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'collecteur') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = PositionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { lat, lng } = parsed.data
    const { error } = await updatePosition(supabase, user.id, lat, lng)
    if (error) throw new Error(error)

    logger.info('Position updated', { userId: user.id, lat, lng })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('POST /api/collecteurs/position failed', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
