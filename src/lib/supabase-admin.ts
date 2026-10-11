// Supabase Storage client (server-side only)
// Used for binary file storage — NEVER expose service-role key to browser
// Users authenticate via Firebase, server verifies ID token, then performs Supabase operations
//
// NOTE: The client is created lazily on first use to avoid failing at build time
// when env vars are not yet loaded.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const bucketName = process.env.SUPABASE_BUCKET || 'strides-files'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.')
  }
  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

export { getClient as getSupabaseClient, bucketName }

/**
 * Upload a file to Supabase Storage (server-side only).
 * @param path - Storage path (e.g., "submissions/{id}/file.pdf")
 * @param file - File buffer or Blob
 * @param contentType - MIME type
 * @returns The storage path if successful, null if failed
 */
export async function uploadFile(
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<string | null> {
  try {
    const client = getClient()
    const { error } = await client.storage
      .from(bucketName)
      .upload(path, file, { contentType, upsert: false })

    if (error) {
      console.error('Supabase upload error:', error.message)
      return null
    }
    return path
  } catch (e: any) {
    console.error('Supabase uploadFile error:', e.message)
    return null
  }
}

/**
 * Generate a short-lived signed URL for downloading/previewing a file.
 * @param path - Storage path
 * @param expiresIn - URL validity in seconds (default 3600 = 1 hour)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const client = getClient()
    const { data, error } = await client.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn)

    if (error || !data) {
      console.error('Supabase signed URL error:', error?.message)
      return null
    }
    return data.signedUrl
  } catch (e: any) {
    console.error('Supabase getSignedUrl error:', e.message)
    return null
  }
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(path: string): Promise<boolean> {
  try {
    const client = getClient()
    const { error } = await client.storage
      .from(bucketName)
      .remove([path])
    return !error
  } catch {
    return false
  }
}

/**
 * List files in a Supabase Storage path.
 */
export async function listFiles(prefix: string) {
  try {
    const client = getClient()
    const { data, error } = await client.storage
      .from(bucketName)
      .list(prefix)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}
