import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { webpayTransaction, PLAN_PRICES, PLAN_DURATIONS } from '@/lib/transbank/client'

/**
 * Calculate prorated credit for upgrade Pro_Mensual → Pro_Anual.
 * Returns the discount in CLP based on remaining days of the monthly plan.
 */
function calculateUpgradeCredit(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  if (daysRemaining <= 0) return 0

  const dailyRate = PLAN_PRICES.Pro_Mensual / PLAN_DURATIONS.Pro_Mensual
  return Math.round(dailyRate * daysRemaining)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { plan } = body as { plan: 'Pro_Mensual' | 'Pro_Anual' }

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PLAN', message: 'Plan no válido' } },
        { status: 400 }
      )
    }

    // Check current billing for upgrade/downgrade logic
    const adminSupabase = createAdminClient()
    const { data: currentBilling } = await adminSupabase
      .from('user_billing')
      .select('plan_type, plan_status, end_date')
      .eq('user_id', user.id)
      .single()

    // Block downgrade: Pro_Anual active → Pro_Mensual not allowed
    if (
      currentBilling &&
      currentBilling.plan_status === 'active' &&
      currentBilling.plan_type === 'Pro_Anual' &&
      plan === 'Pro_Mensual'
    ) {
      const endDate = new Date(currentBilling.end_date)
      if (endDate > new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DOWNGRADE_BLOCKED',
              message: `No puedes cambiar a Pro Mensual mientras tu plan anual esté activo. Vence el ${endDate.toLocaleDateString('es-CL')}.`,
            },
          },
          { status: 400 }
        )
      }
    }

    // Calculate amount (with upgrade credit if applicable)
    let amount = PLAN_PRICES[plan]
    let upgradeCredit = 0

    if (
      currentBilling &&
      currentBilling.plan_status === 'active' &&
      currentBilling.plan_type === 'Pro_Mensual' &&
      plan === 'Pro_Anual' &&
      currentBilling.end_date
    ) {
      upgradeCredit = calculateUpgradeCredit(currentBilling.end_date)
      amount = Math.max(1, amount - upgradeCredit) // Transbank minimum is 1 CLP
    }

    const buyOrder = `GESTI-${plan}-${user.id.slice(0, 8)}-${Date.now()}`
    const sessionId = user.id
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/callback`

    // Record the pending transaction
    await adminSupabase.from('billing_transactions').insert({
      user_id: user.id,
      buy_order: buyOrder,
      plan_type: plan,
      amount,
      status: 'pending',
    })

    // Create Webpay Plus transaction
    const response = await webpayTransaction.create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    )

    return NextResponse.json({
      success: true,
      data: {
        url: response.url,
        token: response.token,
        upgrade_credit: upgradeCredit > 0 ? upgradeCredit : undefined,
      },
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'CHECKOUT_ERROR', message: 'Error al crear transacción de pago' } },
      { status: 500 }
    )
  }
}
