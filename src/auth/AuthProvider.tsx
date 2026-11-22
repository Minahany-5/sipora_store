import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { friendlyAuthError } from '../lib/authErrors'
import { supabase, supabaseConfigError } from '../lib/supabase'
import type { Profile } from '../types'
import { AuthContext, type AuthValue } from './AuthContext'

const PROFILE_COLUMNS = 'full_name, phone, role, completed_orders, language, theme'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null)

  // 1. Who is logged in? (The login is saved in the browser.)
  useEffect(() => {
    if (supabaseConfigError) return // the pages show the .env message
    let cancelled = false
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession(data.session)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionChecked(true)
      })
    // Only set the state here. Do not call Supabase inside this function.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const ready = sessionChecked || supabaseConfigError !== null
  const userId = session?.user.id ?? null

  const loadProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle()
    if (!error) setLoaded({ userId: id, profile: (data as Profile | null) ?? null })
  }, [])

  // 2. Read the profile (name, phone, role) of that person.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled && !error) setLoaded({ userId, profile: (data as Profile | null) ?? null })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const profile = loaded && loaded.userId === userId ? loaded.profile : null

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      ready,
      isStaff: profile?.role === 'admin' || profile?.role === 'staff',

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw friendlyAuthError(error)
      },

      async signUp({ fullName, email, password, phone }) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/login` },
        })
        if (error) throw friendlyAuthError(error)
        // When the email already has an account, Supabase answers with no identities.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error('This email already has an account. Please log in.')
        }
        if (data.session && phone) {
          await supabase.from('profiles').update({ phone }).eq('id', data.session.user.id) // best effort
        }
        return { needsConfirmation: !data.session }
      },

      async signOut() {
        await supabase.auth.signOut()
      },

      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw friendlyAuthError(error)
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw friendlyAuthError(error)
      },

      async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/account` },
        })
        if (error) throw friendlyAuthError(error)
      },

      async updateProfile({ full_name, phone }) {
        if (!userId) throw new Error('Please log in first.')
        const { error } = await supabase.from('profiles').update({ full_name, phone }).eq('id', userId)
        if (error) throw new Error('We could not save your details. Please try again.')
        await loadProfile(userId)
      },

      async refreshProfile() {
        if (userId) await loadProfile(userId)
      },
    }),
    [session, profile, ready, userId, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
