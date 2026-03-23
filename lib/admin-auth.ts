import { supabaseAdmin } from './supabase-admin'

/**
 * Admin authentication.
 * Uses ADMIN_EMAILS env var (comma-separated) to determine admin access.
 * No DB migration needed.
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

/**
 * Check if a user ID belongs to an admin.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (ADMIN_EMAILS.length === 0) return false

  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!data?.email) return false
    return ADMIN_EMAILS.includes(data.email.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Get admin user from auth header, or null if not admin.
 */
export async function getAdminFromToken(authHeader: string | null): Promise<{ id: string } | null> {
  const { getUserFromToken } = await import('./api-auth')
  const user = await getUserFromToken(authHeader)
  if (!user) return null
  const admin = await isAdmin(user.id)
  return admin ? user : null
}
