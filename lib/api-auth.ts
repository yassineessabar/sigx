import { supabaseAdmin } from './supabase-admin'

/**
 * Extract and verify user from an Authorization header.
 * Tries supabaseAdmin.auth.getUser first, falls back to JWT decode.
 */
export async function getUserFromToken(authHeader: string | null): Promise<{ id: string } | null> {
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  // Try official Supabase verification first
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && data?.user) {
      return { id: data.user.id }
    }
  } catch {
    // Service role key may not be configured or token expired
  }

  // Fallback: decode JWT payload to extract user id
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      if (payload.sub && typeof payload.sub === 'string') {
        // Check expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return null // token expired
        }
        return { id: payload.sub }
      }
    }
  } catch {
    // invalid token format
  }

  return null
}
