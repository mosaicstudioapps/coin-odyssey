import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Supabase client for route handlers and server components, bound to this request's cookies. */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a server component, which can't set cookies. The
            // middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    }
  )
}
