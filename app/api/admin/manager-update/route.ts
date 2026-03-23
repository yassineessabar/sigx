import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/admin-auth'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * GET /api/admin/manager-update
 * Serves the latest manager.py for the VPS to download.
 * Protected by admin auth OR the VPS worker key.
 */
export async function GET(request: NextRequest) {
  // Allow either admin auth or VPS worker key
  const admin = await getAdminFromToken(request.headers.get('authorization'))
  const vpsKey = request.headers.get('x-api-key')
  const validVpsKey = vpsKey && vpsKey === process.env.MT5_WORKER_KEY

  if (!admin && !validVpsKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const managerPath = join(process.cwd(), 'mt5_export', 'manager', 'manager.py')
    const content = readFileSync(managerPath, 'utf-8')
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="manager.py"',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'manager.py not found' }, { status: 404 })
  }
}
