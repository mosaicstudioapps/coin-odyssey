import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Where Supabase email links land (sign-up confirmation, password reset).
 * Exchanges the one-time code for a session, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')
  const next = url.searchParams.get('next')

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/auth/signin?error=link_expired', url.origin))
    }
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/auth/reset-password', url.origin))
  }

  // Only same-site paths, so the link can't bounce someone to another site.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  return NextResponse.redirect(new URL(destination, url.origin))
}
