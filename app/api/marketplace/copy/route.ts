import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { strategy_id } = body

    if (!strategy_id) {
      return NextResponse.json({ error: 'strategy_id is required' }, { status: 400 })
    }

    // Check if already copied
    const { data: existingCopy } = await supabaseAdmin
      .from('strategy_copies')
      .select('id')
      .eq('user_id', user.id)
      .eq('strategy_id', strategy_id)
      .maybeSingle()
    if (existingCopy) {
      return NextResponse.json({ error: 'Already copied', alreadyOwned: true }, { status: 409 })
    }

    // Fetch the original public strategy
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('id', strategy_id)
      .eq('is_public', true)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 })
    }

    // Record the copy in strategy_copies
    const { error: copyError } = await supabaseAdmin
      .from('strategy_copies')
      .insert({
        strategy_id: original.id,
        user_id: user.id,
      })

    if (copyError) {
      return NextResponse.json({ error: copyError.message }, { status: 500 })
    }

    // Create a new strategy for the user based on the original
    const { id: _id, user_id: _uid, created_at: _cat, updated_at: _uat, ...rest } = original

    const { data: newStrategy, error: insertError } = await supabaseAdmin
      .from('strategies')
      .insert({
        ...rest,
        user_id: user.id,
        is_public: false,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ strategy: newStrategy }, { status: 201 })
  } catch (error) {
    console.error('Marketplace copy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
