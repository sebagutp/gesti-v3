import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const { data: billing } = await supabase
      .from('user_billing')
      .select('plan_type, plan_status, start_date, end_date, stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!billing) {
      return NextResponse.json({
        success: true,
        data: {
          plan_type: 'free',
          plan_status: 'active',
          start_date: null,
          end_date: null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        plan_type: billing.plan_type,
        plan_status: billing.plan_status,
        start_date: billing.start_date,
        end_date: billing.end_date,
        has_subscription: !!billing.stripe_subscription_id,
      },
    })
  } catch (error) {
    console.error('Plan query error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'PLAN_ERROR', message: 'Error al consultar plan' } },
      { status: 500 }
    )
  }
}
