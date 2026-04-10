import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNotifications, getUnreadCount } from '@/lib/db/queries'
import { markNotificationsRead } from '@/lib/db/mutations'
import { NotificationBatchSchema } from '@/lib/schemas'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET : notifications paginées
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const params = req.nextUrl.searchParams
    const cursor      = params.get('cursor') ?? undefined
    const unreadOnly  = params.get('unread') === 'true'
    const limit       = Math.min(Number(params.get('limit') ?? 20), 100)

    const { data, nextCursor, error } = await getNotifications(supabase, user.id, {
      cursor,
      unreadOnly,
      limit,
    })
    if (error) throw error

    const { count } = await getUnreadCount(supabase, user.id)

    return NextResponse.json(
      { data, nextCursor, unreadCount: count ?? 0 },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    logger.error('GET /api/notifications failed', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH : marquer comme lu (batch)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = NotificationBatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { error } = await markNotificationsRead(supabase, user.id, parsed.data.ids)
    if (error) throw new Error(error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('PATCH /api/notifications failed', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
