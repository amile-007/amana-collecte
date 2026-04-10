import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password']
const PERF_THRESHOLD_MS = 3000

export async function proxy(request: NextRequest) {
  const start = Date.now()
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  try {
    const { supabaseResponse, user } = await updateSession(request)
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
    const elapsed = Date.now() - start

    // Log structuré pour Vercel
    const entry = { ts: new Date().toISOString(), method: request.method, path: pathname, user: user?.email ?? null, elapsed_ms: elapsed }
    if (elapsed > PERF_THRESHOLD_MS) {
      console.error(JSON.stringify({ ...entry, level: 'warn', msg: 'Slow proxy response' }))
    } else {
      console.log(JSON.stringify({ ...entry, level: 'info' }))
    }

    if (!user && !isPublicPath) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Ne pas rediriger les utilisateurs connectés hors des pages publiques :
    // app/page.tsx gère la redirection par rôle — évite la boucle infinie.

    return supabaseResponse
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'Proxy error', path: pathname, error: String(err) }))
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
