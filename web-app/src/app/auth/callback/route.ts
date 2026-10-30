import { NextResponse, type NextRequest } from 'next/server'
import { isAuthPKCECodeVerifierMissingError } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Where Supabase email links land (sign-up confirmation, password reset).
 * Exchanges the one-time code for a session, then continues to `next`.
 *
 * When a link can't sign someone in, the next page says why:
 * - `expired`: Supabase refused the link (too old, or already used). It
 *   sends `error_code` back instead of a code.
 * - `other_device`: the link is fine, but this browser didn't ask for it.
 *   The code only exchanges in the browser that holds the matching verifier,
 *   so a link requested on a computer and opened on a phone lands here. For a
 *   sign-up, Supabase has already confirmed the email by this point.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')
  const next = url.searchParams.get('next')

  let problem: 'expired' | 'other_device' | null =
    url.searchParams.get('error_code') || url.searchParams.get('error') ? 'expired' : null

  if (code && !problem) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) problem = isAuthPKCECodeVerifierMissingError(error) ? 'other_device' : 'expired'
  }

  if (type === 'recovery') {
    const resetPage = problem ? `/auth/reset-password?problem=${problem}` : '/auth/reset-password'
    return NextResponse.redirect(new URL(resetPage, url.origin))
  }

  if (problem) {
    const signIn = problem === 'other_device' ? '/auth/signin?notice=email_confirmed' : '/auth/signin?error=link_expired'
    return NextResponse.redirect(new URL(signIn, url.origin))
  }

  // Only same-site paths, so the link can't bounce someone to another site.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  return NextResponse.redirect(new URL(destination, url.origin))
}
