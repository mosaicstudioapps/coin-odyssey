import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. @supabase/ssr keeps the session in cookies,
// so the server (middleware, route handlers) sees the same signed-in user.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createBrowserClient(url, anonKey)
