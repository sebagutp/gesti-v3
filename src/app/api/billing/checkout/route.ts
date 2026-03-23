import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { webpayTransaction, PLAN_PRICES } from '@/lib/transbank/client'

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

    const amount = PLAN_PRICES[plan]
    const buyOrder = `GESTI-${plan}-${user.id.slice(0, 8)}-${Date.now()}`
    const sessionId = user.id
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/callback`

    // Record the pending transaction
    const adminSupabase = createAdminClient()
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
