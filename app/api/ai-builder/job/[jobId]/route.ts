import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/ai-builder/job/[jobId]
 * Proxies poll from MT5_MANAGER_URL/job/{jobId}. Returns job results.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const managerUrl = process.env.MT5_MANAGER_URL
  const workerKey = process.env.MT5_WORKER_KEY

  if (!managerUrl) {
    return NextResponse.json({ error: 'MT5_MANAGER_URL not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${managerUrl}/job/${jobId}`, {
      headers: {
        ...(workerKey ? { 'x-api-key': workerKey } : {}),
      },
    })

    if (!res.ok) {
      const errBody = await res.text()
      return NextResponse.json(
        { error: 'Failed to get job', detail: errBody },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Job poll error:', error)
    return NextResponse.json({ error: 'Failed to connect to manager' }, { status: 502 })
  }
}

export const dynamic = 'force-dynamic'
