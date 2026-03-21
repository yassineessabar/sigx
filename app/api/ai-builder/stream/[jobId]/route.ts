import { NextRequest } from 'next/server'

/**
 * GET /api/ai-builder/stream/[jobId]
 * Proxies the SSE stream from the Hybrid Manager to the client.
 * No auth needed — the jobId itself acts as auth.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const managerUrl = process.env.MT5_MANAGER_URL
  const workerKey = process.env.MT5_WORKER_KEY

  if (!managerUrl) {
    return new Response(JSON.stringify({ error: 'MT5_MANAGER_URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(`${managerUrl}/job/${jobId}/stream`, {
      headers: {
        ...(workerKey ? { 'x-api-key': workerKey } : {}),
      },
    })

    if (!res.ok) {
      const errBody = await res.text()
      return new Response(JSON.stringify({ error: 'Stream failed', detail: errBody }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Proxy the SSE stream directly to the client
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream proxy error:', error)
    return new Response(JSON.stringify({ error: 'Failed to connect to manager' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Disable body parsing and set dynamic runtime
export const dynamic = 'force-dynamic'
