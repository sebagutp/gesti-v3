import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado' } },
        { status: 401 }
      )
    }

    const adminSupabase = createAdminClient()
    const { data: billing } = await adminSupabase
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!billing?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_CUSTOMER', message: 'No tienes una suscripción activa' } },
        { status: 400 }
      )
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/facturacion`,
    })

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'PORTAL_ERROR', message: 'Error al abrir portal de facturación' } },
      { status: 500 }
    )
  }
}
