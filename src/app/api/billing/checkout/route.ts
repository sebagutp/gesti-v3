import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, STRIPE_PLANS } from '@/lib/stripe/client'

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

    if (!plan || !STRIPE_PLANS[plan]) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PLAN', message: 'Plan no válido' } },
        { status: 400 }
      )
    }

    const priceId = STRIPE_PLANS[plan]
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PRICE', message: 'Price ID de Stripe no configurado' } },
        { status: 500 }
      )
    }

    // Check if user already has a Stripe customer ID
    const adminSupabase = createAdminClient()
    const { data: billing } = await adminSupabase
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = billing?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Upsert billing record with customer ID
      await adminSupabase.from('user_billing').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_type: 'free',
        plan_status: 'active',
      }, { onConflict: 'user_id' })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/facturacion/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/facturacion`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: plan,
      },
    })

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'CHECKOUT_ERROR', message: 'Error al crear sesión de pago' } },
      { status: 500 }
    )
  }
}
