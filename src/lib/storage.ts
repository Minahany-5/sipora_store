import { supabase } from './supabase'

const MAX_BYTES = 5 * 1024 * 1024 // the bucket allows 5 MB
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** null = the file is fine. */
export function validateScreenshot(file: File): string | null {
  if (!EXT[file.type]) return 'Please choose a PNG, JPG or WEBP picture.'
  if (file.size > MAX_BYTES) return 'The picture is too big. The limit is 5 MB.'
  return null
}

/** Uploads the screenshot to the private bucket, inside the customer's own folder. Returns the path. */
export async function uploadScreenshot(userId: string, file: File): Promise<string> {
  const problem = validateScreenshot(file)
  if (problem) throw new Error(problem)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[file.type]}`
  const { error } = await supabase.storage.from('payment-screenshots').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error('We could not upload your screenshot. Please try again.')
  return path
}
