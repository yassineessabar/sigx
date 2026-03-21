import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function PATCH(
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

    const allowed = ['status', 'lot_size']
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    // Validate status transitions
    if (body.status && !['running', 'paused', 'stopped'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: deployment, error } = await supabaseAdmin
      .from('deployments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If stopping, update strategy status
    if (body.status === 'stopped' && deployment.strategy_id) {
      await supabaseAdmin
        .from('strategies')
        .update({ status: 'backtested', updated_at: new Date().toISOString() })
        .eq('id', deployment.strategy_id)
    }

    return NextResponse.json({ deployment })
  } catch (error) {
    console.error('Deployment PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch deployment to get strategy_id before deleting
    const { data: deployment, error: fetchError } = await supabaseAdmin
      .from('deployments')
      .select('strategy_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
    }

    // Delete the deployment
    const { error: deleteError } = await supabaseAdmin
      .from('deployments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Set strategy status back to backtested
    await supabaseAdmin
      .from('strategies')
      .update({ status: 'backtested', updated_at: new Date().toISOString() })
      .eq('id', deployment.strategy_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deployment DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
