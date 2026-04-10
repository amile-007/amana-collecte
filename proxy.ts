import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log(`[proxy] ${request.method} ${pathname}`)

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

    console.log(`[proxy] user=${user?.email ?? 'none'} public=${isPublicPath}`)

    if (!user && !isPublicPath) {
      console.log(`[proxy] → redirect /login (not authenticated)`)
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Ne pas rediriger les utilisateurs connectés hors des pages publiques :
    // app/page.tsx gère la redirection par rôle — évite la boucle infinie.

    return supabaseResponse
  } catch (err) {
    console.error(`[proxy] error:`, err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
