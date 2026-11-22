import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../types'

export interface SignUpInput {
  fullName: string
  email: string
  password: string
  phone?: string
}

export interface AuthValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** false until the first check of the saved login is finished */
  ready: boolean
  /** admin or staff */
  isStaff: boolean
  /** All these functions throw an Error with a simple message. */
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  updateProfile: (input: { full_name: string; phone: string | null }) => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
