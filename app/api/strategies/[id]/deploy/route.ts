import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { broker, account_id, lot_size } = body

    if (!broker) {
      return NextResponse.json({ error: 'broker is required' }, { status: 400 })
    }

    // Verify strategy belongs to user
    const { data: strategy, error: stratError } = await supabaseAdmin
      .from('strategies')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (stratError || !strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    // Create deployment record
    const { data: deployment, error: deployError } = await supabaseAdmin
      .from('deployments')
      .insert({
        user_id: user.id,
        strategy_id: id,
        broker,
        account_id: account_id || null,
        lot_size: lot_size || 0.1,
        status: 'running',
      })
      .select()
      .single()

    if (deployError) {
      return NextResponse.json({ error: deployError.message }, { status: 500 })
    }

    // Update strategy status to deployed
    await supabaseAdmin
      .from('strategies')
      .update({ status: 'deployed', updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ deployment }, { status: 201 })
  } catch (error) {
    console.error('Strategy deploy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
