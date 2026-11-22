/** Turns a Supabase login error into a short, simple sentence. */
export function friendlyAuthError(error: { message: string; code?: string; status?: number }): Error {
  const m = error.message.toLowerCase()
  const code = error.code ?? ''
  let text: string
  if (m.includes('invalid login credentials') || code === 'invalid_credentials') text = 'Wrong email or password.'
  else if (m.includes('email not confirmed') || code === 'email_not_confirmed') text = 'Please confirm your email first. Check your inbox.'
  else if (m.includes('already registered') || code === 'user_already_exists') text = 'This email already has an account. Please log in.'
  else if (m.includes('rate limit') || code === 'over_email_send_rate_limit' || error.status === 429) text = 'Too many tries. Please wait a few minutes and try again.'
  else if (m.includes('password') && (m.includes('short') || m.includes('least') || code === 'weak_password')) text = 'The password is too weak. Use at least 8 letters and numbers.'
  else if (m.includes('same password') || code === 'same_password') text = 'Please choose a new password that is different from the old one.'
  else if (m.includes('failed to fetch') || m.includes('network')) text = 'We cannot reach the server. Check your internet.'
  else text = 'Something went wrong. Please try again.'
  return new Error(text)
}
