import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
      .select('plan_type, plan_status, start_date, end_date')
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
          has_active_plan: false,
          days_remaining: null,
        },
      })
    }

    // Calculate days remaining
    let daysRemaining: number | null = null
    let hasActivePlan = billing.plan_status === 'active'

    if (billing.end_date) {
      const endDate = new Date(billing.end_date)
      const now = new Date()
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysRemaining < 0) {
        daysRemaining = 0
        hasActivePlan = false
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        plan_type: billing.plan_type,
        plan_status: billing.plan_status,
        start_date: billing.start_date,
        end_date: billing.end_date,
        has_active_plan: hasActivePlan,
        days_remaining: daysRemaining,
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
