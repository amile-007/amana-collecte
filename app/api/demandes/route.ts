import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDemandes } from '@/lib/db/queries'
import { PaginationSchema } from '@/lib/schemas'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const start = Date.now()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, centre_id')
      .eq('id', user.id)
      .single()

    const params = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = PaginationSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { cursor, limit, statut, centreId } = parsed.data

    const filter: Parameters<typeof getDemandes>[1] = { cursor, limit }

    // Scope par rôle
    switch (profile?.role) {
      case 'client':
        filter.clientId = user.id
        break
      case 'collecteur':
        filter.collecteurId = user.id
        break
      case 'chef_centre':
        filter.centreId = centreId ?? profile.centre_id ?? undefined
        break
      case 'admin':
      case 'superviseur':
        if (centreId) filter.centreId = centreId
        break
      default:
        return NextResponse.json({ error: 'Rôle inconnu' }, { status: 403 })
    }

    if (statut) filter.statuts = [statut as never]

    const { data, nextCursor, error } = await getDemandes(supabase, filter)
    if (error) throw error

    logger.info('GET /api/demandes', { userId: user.id, count: data.length, elapsed_ms: Date.now() - start })

    return NextResponse.json(
      { data, nextCursor },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    logger.error('GET /api/demandes failed', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
