import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/admin-auth'

/** GET /api/admin/check — Returns { isAdmin: true/false } */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromToken(request.headers.get('authorization'))
  return NextResponse.json({ isAdmin: !!admin })
}
