import { useAuth } from '../auth/useAuth'

/** The logged-in session (or null). It comes from the AuthProvider. */
export function useSession() {
  const { session, ready } = useAuth()
  return { session, ready }
}
