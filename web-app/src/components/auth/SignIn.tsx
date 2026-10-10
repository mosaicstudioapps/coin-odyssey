'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignIn() {
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setOrigin(window.location.origin)
    // Check if this is a signup request from URL parameters
    const signupParam = searchParams.get('signup')
    if (signupParam === 'true') {
      setIsSignUp(true)
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: e.currentTarget.email.value,
        password: e.currentTarget.password.value,
      })

      if (error) throw error

      // Back to the page the middleware sent them from, if it's on this site.
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: e.currentTarget.email.value,
        password: e.currentTarget.password.value,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      })

      if (error) throw error

      // Show success message
      setSuccessMessage('Account created successfully! Please check your email for a confirmation link to activate your account.')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setSuccessMessage(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">
              {isSignUp ? 'Create your account' : 'Sign in to Coin Odyssey'}
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'Join thousands of collectors tracking their coins' : 'Track and manage your coin collection'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-4">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 rounded-md bg-green-500/10 p-4">
                <div className="text-sm text-green-600 dark:text-green-400">{successMessage}</div>
              </div>
            )}
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                />
                {isSignUp && (
                  <p className="text-sm text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>

              {!isSignUp && (
                <div className="flex justify-end">
                  <Button variant="link" asChild className="px-0 h-auto text-sm">
                    <Link href="/auth/forgot-password">Forgot password?</Link>
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={toggleAuthMode}
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Button>
              </div>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
