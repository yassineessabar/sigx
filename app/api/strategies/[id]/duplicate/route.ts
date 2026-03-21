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

    // Fetch the original strategy (must belong to user)
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    // Remove fields that should not be copied
    const { id: _id, user_id: _uid, created_at: _cat, updated_at: _uat, ...rest } = original

    const { data: duplicate, error: insertError } = await supabaseAdmin
      .from('strategies')
      .insert({
        ...rest,
        user_id: user.id,
        name: `${original.name} (Copy)`,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ strategy: duplicate }, { status: 201 })
  } catch (error) {
    console.error('Strategy duplicate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
