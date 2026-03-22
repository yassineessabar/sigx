import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { PLANS, type PlanId } from '@/lib/credit-costs'

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('credits_balance, plan')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const plan = (data?.plan || 'free') as PlanId
  const planDef = PLANS[plan] || PLANS.free

  return NextResponse.json({
    credits: data?.credits_balance ?? 0,
    plan,
    max_credits: planDef.credits,
    plan_name: planDef.name,
  })
}
