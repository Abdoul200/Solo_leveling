import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes protégées (requièrent une authentification)
const PROTECTED_ROUTES = [
  '/dashboard',
  '/quetes',
  '/donjons',
  '/profil',
  '/stats',
  '/sport',
  '/journal',
  '/titres',
]

// Routes publiques (rediriger si déjà authentifié)
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Récupérer la session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Vérifier si la route est protégée
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // Vérifier si c'est une route d'auth
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Pas de session et route protégée → rediriger vers login
  if (!session && isProtectedRoute) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Session existante et route d'auth → rediriger vers dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Correspond à toutes les routes sauf:
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - Fichiers publics (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
