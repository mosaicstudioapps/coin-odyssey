import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Signed-in sections. Everything else (landing, auth, legal, public checklists) is open. */
const PROTECTED_PREFIXES = ['/dashboard', '/scan', '/collection', '/albums', '/achievements', '/map', '/settings']

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Refresh the session cookie on every request and keep signed-out visitors
 * out of the app. Follows the @supabase/ssr pattern: the response must carry
 * any cookies the client refreshed.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // getUser() checks the token with Supabase; don't trust the cookie alone.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const signIn = request.nextUrl.clone()
    signIn.pathname = '/auth/signin'
    signIn.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(signIn)
  }

  // Already signed in: skip the sign-in and sign-up forms. (Password reset
  // stays reachable, since a reset link signs you in first.)
  if (user && (request.nextUrl.pathname === '/auth/signin' || request.nextUrl.pathname === '/auth/signup')) {
    const next = request.nextUrl.searchParams.get('next')
    const home = request.nextUrl.clone()
    home.pathname = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
    home.search = ''
    return NextResponse.redirect(home)
  }

  return response
}
