import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Laisse passer les routes publiques et assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Pour les routes protégées, le check auth se fait côté client (Firebase)
  // Ce middleware est un filet de sécurité léger
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
